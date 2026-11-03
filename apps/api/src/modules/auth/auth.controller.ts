import { Body, Controller, Delete, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { loginSchema, refreshSchema, registerSchema } from '@ltv/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: ReturnType<typeof registerSchema.parse>) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: ReturnType<typeof loginSchema.parse>) {
    return this.auth.login(body);
  }

  @Public()
  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: ReturnType<typeof refreshSchema.parse>) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@CurrentUser() user: AuthenticatedUser, @Body() body: { refreshToken?: string }) {
    return this.auth.logout(user.userId, body?.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.userId);
  }

  @Delete('account')
  deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.deleteOwnTenant(user.tenantId);
  }
}
