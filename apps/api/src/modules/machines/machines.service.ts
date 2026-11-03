import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMachineInput, UpdateMachineInput } from '@ltv/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MachinesService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.machine.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(tenantId: string, id: string) {
    const machine = await this.prisma.machine.findFirst({ where: { id, tenantId } });
    if (!machine) throw new NotFoundException('Máquina no encontrada');
    return machine;
  }

  create(tenantId: string, input: CreateMachineInput) {
    return this.prisma.machine.create({
      data: { tenantId, ...input },
    });
  }

  async update(tenantId: string, id: string, input: UpdateMachineInput) {
    await this.get(tenantId, id); // valida que exista y sea de este tenant
    return this.prisma.machine.update({ where: { id }, data: input });
  }
}
