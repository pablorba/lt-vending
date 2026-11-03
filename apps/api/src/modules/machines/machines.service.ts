import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ltv/db';
import { DEFAULT_LAYOUT, type CreateMachineInput, type UpdateMachineInput } from '@ltv/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MachinesService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.machine.findMany({
      where: { tenantId },
      include: { _count: { select: { slots: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(tenantId: string, id: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, tenantId },
      include: {
        slots: {
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true, price: true, cost: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: [{ level: 'asc' }, { position: 'asc' }],
        },
      },
    });
    if (!machine) throw new NotFoundException('Máquina no encontrada');
    return machine;
  }

  /**
   * Crea la máquina con su planograma vacío. Si no se manda layout propio,
   * usa DEFAULT_LAYOUT (el de la máquina real de Capithal Park). Los
   * espirales nacen sin producto: se asignan después desde el planograma.
   */
  create(tenantId: string, input: CreateMachineInput) {
    const { layout, ...data } = input;
    const rows = layout?.length ? layout : DEFAULT_LAYOUT;

    return this.prisma.$transaction(async (tx) => {
      const machine = await tx.machine.create({ data: { tenantId, ...data } });

      const slots: Prisma.SlotCreateManyInput[] = [];
      rows.forEach((row, li) => {
        const level = li + 1;
        row.forEach((capacity, pi) => {
          const position = pi + 1;
          slots.push({
            tenantId,
            machineId: machine.id,
            level,
            position,
            code: `${level}-${String(position).padStart(2, '0')}`,
            capacity,
          });
        });
      });
      await tx.slot.createMany({ data: slots });

      return machine;
    });
  }

  async update(tenantId: string, id: string, input: UpdateMachineInput) {
    await this.get(tenantId, id); // valida que exista y sea de este tenant
    return this.prisma.machine.update({ where: { id }, data: input });
  }
}
