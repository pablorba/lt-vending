import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthTokens, AuthUserPayload, LoginInput, RegisterInput } from '@ltv/shared';

interface UserForToken {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /** Alta de un operador nuevo: crea su tenant y su usuario OWNER en una transacción. */
  async register(input: RegisterInput): Promise<AuthTokens & { user: AuthUserPayload }> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Ya existe una cuenta con ese correo');

    const slug = await this.uniqueSlug(input.tenantName);
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: input.tenantName, slug },
      });
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          name: input.name,
          role: 'OWNER',
        },
      });
    });

    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthTokens & { user: AuthUserPayload }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens & { user: AuthUserPayload }> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // NO rotamos el refresh token: el mismo sigue válido hasta su expiración
    // (ver la-terraza-pos, mismo criterio — evita que peticiones concurrentes
    // se invaliden entre sí).
    const user = stored.user;
    const accessToken = await this.signAccessToken(user);
    const expiresIn = this.parseExpiresIn(this.config.get<string>('JWT_EXPIRES_IN') ?? '15m');

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: this.toUserPayload(user),
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revoked: false },
        data: { revoked: true },
      });
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async me(userId: string): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toUserPayload(user);
  }

  /** Autoservicio: borra el tenant del usuario autenticado (cascada: usuarios, máquinas, etc). */
  async deleteOwnTenant(tenantId: string): Promise<void> {
    await this.prisma.tenant.delete({ where: { id: tenantId } });
  }

  private signAccessToken(user: UserForToken): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });
  }

  private async issueTokens(user: UserForToken): Promise<AuthTokens & { user: AuthUserPayload }> {
    const accessToken = await this.signAccessToken(user);

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const refreshSeconds = this.parseExpiresIn(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '365d',
    );
    const expiresAt = new Date(Date.now() + refreshSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const expiresIn = this.parseExpiresIn(this.config.get<string>('JWT_EXPIRES_IN') ?? '15m');

    return { accessToken, refreshToken, expiresIn, user: this.toUserPayload(user) };
  }

  private toUserPayload(user: UserForToken): AuthUserPayload {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'operador';

    let slug = base;
    let i = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${base}-${++i}`;
    }
    return slug;
  }

  private parseExpiresIn(s: string): number {
    const match = /^(\d+)([smhd])$/.exec(s);
    if (!match) return 900;
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return n * mult;
  }
}
