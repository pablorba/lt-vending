import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateProductInput, UpdateProductInput } from '@ltv/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async get(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  create(tenantId: string, input: CreateProductInput) {
    return this.prisma.product.create({ data: { tenantId, ...input } });
  }

  async update(tenantId: string, id: string, input: UpdateProductInput) {
    await this.get(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: input });
  }
}
