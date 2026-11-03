import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ltv/db';
import { MAX_PRODUCTS_PER_SLOT } from '@ltv/shared';
import type {
  CreateRestockInput,
  RegisterCollectionInput,
  RegisterWasteInput,
  SetSlotProductsInput,
  UpdateSlotInput,
} from '@ltv/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { compareRestockRows, computeCoverage, round2, soldQtyFromDiff, totalAfterRestock } from './restock-math';

const D = (n: Prisma.Decimal | number | string) => new Prisma.Decimal(n);

/**
 * Lógica de planograma, surtido, merma y dinero recogido. Portada de
 * la-terraza-pos (apps/api/src/modules/vending/vending.service.ts), que ya
 * opera la máquina real de Capithal Park. Diferencia: aquí no hay un
 * inventario de bodega/food-truck del que "salga" lo que se carga a la
 * máquina — lo cargado (addedQty) solo se registra en el surtido mismo.
 */
@Injectable()
export class OperationsService {
  constructor(private prisma: PrismaService) {}

  // ---------------- Planograma ----------------

  private async getSlotForTenant(tenantId: string, slotId: string) {
    const slot = await this.prisma.slot.findFirst({ where: { id: slotId, tenantId } });
    if (!slot) throw new NotFoundException('Espiral no encontrado');
    return slot;
  }

  async updateSlot(tenantId: string, slotId: string, data: UpdateSlotInput) {
    await this.getSlotForTenant(tenantId, slotId);

    if (data.capacity !== undefined) {
      const agg = await this.prisma.slotItem.aggregate({
        where: { slotId },
        _sum: { currentQty: true },
      });
      const loaded = Number(agg._sum.currentQty ?? 0);
      if (data.capacity < loaded) {
        throw new BadRequestException(
          `No puedes bajar la capacidad a ${data.capacity}: el espiral tiene ${loaded} piezas cargadas.`,
        );
      }
    }

    return this.prisma.slot.update({
      where: { id: slotId },
      data: {
        ...(data.code !== undefined ? { code: data.code.trim() } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { items: { include: { product: { select: { id: true, name: true } } } } },
    });
  }

  /**
   * Define qué productos lleva un espiral (1 a 4). Reemplaza la lista: los
   * que quites se borran, los que dejes conservan sus piezas cargadas.
   */
  async setSlotProducts(tenantId: string, slotId: string, input: SetSlotProductsInput) {
    const unique = [...new Set(input.productIds.filter(Boolean))];
    if (unique.length > MAX_PRODUCTS_PER_SLOT) {
      throw new BadRequestException(
        `Un espiral admite máximo ${MAX_PRODUCTS_PER_SLOT} productos distintos.`,
      );
    }

    const slot = await this.prisma.slot.findFirst({
      where: { id: slotId, tenantId },
      include: { items: true },
    });
    if (!slot) throw new NotFoundException('Espiral no encontrado');

    if (unique.length) {
      const owned = await this.prisma.product.count({
        where: { id: { in: unique }, tenantId },
      });
      if (owned !== unique.length) {
        throw new BadRequestException('Uno o más productos no pertenecen a tu cuenta');
      }
    }

    const toRemove = slot.items.filter((i) => !unique.includes(i.productId));
    const loadedBeingRemoved = toRemove.filter((i) => i.currentQty > 0);
    if (loadedBeingRemoved.length) {
      throw new BadRequestException(
        'Ese producto todavía tiene piezas en el espiral. Sácalas y regístralas como merma antes de quitarlo.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (toRemove.length) {
        await tx.slotItem.deleteMany({ where: { id: { in: toRemove.map((i) => i.id) } } });
      }
      for (let i = 0; i < unique.length; i++) {
        await tx.slotItem.upsert({
          where: { slotId_productId: { slotId, productId: unique[i] } },
          create: { slotId, productId: unique[i], sortOrder: i },
          update: { sortOrder: i },
        });
      }
      return tx.slot.findUnique({
        where: { id: slotId },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, sku: true, price: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  // ---------------- Plan de surtido ----------------

  /**
   * Qué llevar en la próxima visita. Por espiral y producto: falta =
   * capacidad − lo que hay; velocidad = piezas/día de los últimos 30 días;
   * cobertura = cuántos días aguanta con lo que hay. Sin historial, la
   * velocidad sale en 0 y solo se sugiere llenar a capacidad.
   */
  async restockPlan(tenantId: string, machineId: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, tenantId },
      include: {
        slots: {
          include: { items: { include: { product: true } } },
          orderBy: [{ level: 'asc' }, { position: 'asc' }],
        },
      },
    });
    if (!machine) throw new NotFoundException('Máquina no encontrada');

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sold = await this.prisma.restockLine.groupBy({
      by: ['slotId', 'productId'],
      where: { restock: { machineId, createdAt: { gte: since } } },
      _sum: { soldQty: true },
    });
    const key = (slotId: string, productId: string) => `${slotId}::${productId}`;
    const soldBy = new Map(sold.map((r) => [key(r.slotId, r.productId), Number(r._sum.soldQty ?? 0)]));

    const restocks = await this.prisma.restock.findMany({
      where: { machineId, createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const daysMeasured = new Set(restocks.map((r) => r.createdAt.toISOString().slice(0, 10))).size;

    const rows: Array<{
      slotId: string;
      code: string;
      level: number;
      position: number;
      capacity: number;
      slotLoaded: number;
      slotFree: number;
      productId: string;
      productName: string;
      price: number;
      currentQty: number;
      perDay: number;
      coverDays: number | null;
      urgent: boolean;
    }> = [];

    for (const slot of machine.slots) {
      if (!slot.isActive || slot.items.length === 0) continue;
      const slotLoaded = slot.items.reduce((a, i) => a + i.currentQty, 0);
      for (const it of slot.items) {
        const totalSold = soldBy.get(key(slot.id, it.productId)) ?? 0;
        const { perDay, coverDays, urgent } = computeCoverage(totalSold, daysMeasured, it.currentQty);
        rows.push({
          slotId: slot.id,
          code: slot.code,
          level: slot.level,
          position: slot.position,
          capacity: slot.capacity,
          slotLoaded,
          slotFree: Math.max(0, slot.capacity - slotLoaded),
          productId: it.productId,
          productName: it.product.name,
          price: Number(it.product.price),
          currentQty: it.currentQty,
          perDay,
          coverDays,
          urgent,
        });
      }
    }

    rows.sort(compareRestockRows);

    return {
      machineId,
      daysMeasured,
      emptySlots: machine.slots.filter((s) => s.isActive && s.items.length === 0).length,
      rows,
    };
  }

  // ---------------- Surtido ----------------

  /**
   * Registra una visita a surtir. Por espiral: vendido = esperado −
   * encontrado (nunca negativo). Deja el espiral con la cantidad final y
   * guarda valor de venta y costo para el dashboard.
   */
  async createRestock(tenantId: string, input: CreateRestockInput, userId: string) {
    const slotIds = [...new Set(input.lines.map((l) => l.slotId))];
    const slots = await this.prisma.slot.findMany({
      where: { id: { in: slotIds }, tenantId },
      include: { items: { include: { product: true } } },
    });
    const bySlot = new Map(slots.map((s) => [s.id, s]));

    for (const l of input.lines) {
      const slot = bySlot.get(l.slotId);
      if (!slot) throw new BadRequestException(`Espiral ${l.slotId} no existe`);
      if (slot.machineId !== input.machineId) {
        throw new BadRequestException(`El espiral ${slot.code} no es de esta máquina`);
      }
      const item = slot.items.find((i) => i.productId === l.productId);
      if (!item) {
        throw new BadRequestException(`Ese producto no está asignado al espiral ${slot.code}`);
      }
    }

    // La capacidad es del espiral completo: se valida sumando todos sus
    // productos, contando los que no se tocaron en este surtido.
    for (const slotId of slotIds) {
      const slot = bySlot.get(slotId)!;
      const touched = new Map(
        input.lines.filter((l) => l.slotId === slotId).map((l) => [l.productId, l]),
      );
      const total = totalAfterRestock(slot.items, touched);
      if (total > slot.capacity) {
        throw new BadRequestException(
          `En ${slot.code} no caben ${total} piezas entre todos sus productos: la capacidad es ${slot.capacity}.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const restock = await tx.restock.create({
        data: { tenantId, machineId: input.machineId, userId, notes: input.notes },
      });

      let soldUnits = 0;
      let addedUnits = 0;
      let soldValue = D(0);
      let soldCogs = D(0);

      for (const l of input.lines) {
        const slot = bySlot.get(l.slotId)!;
        const item = slot.items.find((i) => i.productId === l.productId)!;
        const price = D(item.product.price);
        const cost = D(item.product.cost);
        const expected = item.currentQty;
        const soldQty = soldQtyFromDiff(expected, l.foundQty);
        const finalQty = l.foundQty + l.addedQty;

        const lineValue = price.times(soldQty);
        const lineCogs = cost.times(soldQty);

        await tx.restockLine.create({
          data: {
            restockId: restock.id,
            slotId: slot.id,
            productId: l.productId,
            expectedQty: expected,
            foundQty: l.foundQty,
            addedQty: l.addedQty,
            finalQty,
            soldQty,
            unitPrice: price,
            unitCost: cost,
            saleValue: lineValue,
            cogs: lineCogs,
          },
        });

        await tx.slotItem.update({ where: { id: item.id }, data: { currentQty: finalQty } });

        soldUnits += soldQty;
        addedUnits += l.addedQty;
        soldValue = soldValue.plus(lineValue);
        soldCogs = soldCogs.plus(lineCogs);
      }

      return tx.restock.update({
        where: { id: restock.id },
        data: { soldUnits, addedUnits, soldValue, soldCogs },
        include: { lines: true },
      });
    });
  }

  listRestocks(tenantId: string, machineId?: string, limit = 30) {
    return this.prisma.restock.findMany({
      where: { tenantId, ...(machineId ? { machineId } : {}) },
      include: {
        user: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getRestock(tenantId: string, id: string) {
    const r = await this.prisma.restock.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
        lines: {
          include: {
            slot: { select: { code: true, level: true } },
            product: { select: { name: true, sku: true } },
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Surtido no encontrado');
    return r;
  }

  // ---------------- Merma y dinero ----------------

  /** Sin esto, todo lo que falta se contaría como vendido e infla las ventas. */
  async registerWaste(tenantId: string, input: RegisterWasteInput, userId: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: input.machineId, tenantId },
      select: { id: true },
    });
    if (!machine) throw new BadRequestException('Máquina no encontrada');

    const product = await this.prisma.product.findFirst({
      where: { id: input.productId, tenantId },
      select: { cost: true },
    });
    if (!product) throw new BadRequestException('Producto no encontrado');

    if (input.slotId) {
      const slot = await this.prisma.slot.findFirst({
        where: { id: input.slotId, tenantId, machineId: input.machineId },
        select: { id: true },
      });
      if (!slot) throw new BadRequestException('Ese espiral no es de esta máquina');
    }

    return this.prisma.$transaction(async (tx) => {
      const waste = await tx.wasteEntry.create({
        data: {
          tenantId,
          machineId: input.machineId,
          slotId: input.slotId,
          productId: input.productId,
          quantity: input.quantity,
          reason: input.reason,
          unitCost: product.cost,
          notes: input.notes,
          userId,
        },
      });

      if (input.slotId) {
        const item = await tx.slotItem.findUnique({
          where: { slotId_productId: { slotId: input.slotId, productId: input.productId } },
        });
        if (item) {
          await tx.slotItem.update({
            where: { id: item.id },
            data: { currentQty: Math.max(0, item.currentQty - input.quantity) },
          });
        }
      }

      return waste;
    });
  }

  async registerCollection(tenantId: string, input: RegisterCollectionInput, userId: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: input.machineId, tenantId },
      select: { id: true },
    });
    if (!machine) throw new BadRequestException('Máquina no encontrada');

    return this.prisma.collection.create({
      data: {
        tenantId,
        machineId: input.machineId,
        cashAmount: D(input.cashAmount ?? 0),
        cardAmount: D(input.cardAmount ?? 0),
        notes: input.notes,
        userId,
      },
    });
  }

  // ---------------- Dashboard ----------------

  /**
   * KPIs en un rango. La venta es inferida por diferencia de surtidos, por
   * eso se expone también el dinero recogido: si no cuadran, hay merma no
   * registrada o error de conteo.
   */
  async dashboard(tenantId: string, machineId: string | undefined, from: Date, to: Date) {
    const where: Prisma.RestockWhereInput = {
      tenantId,
      createdAt: { gte: from, lt: to },
      ...(machineId ? { machineId } : {}),
    };

    const restocks = await this.prisma.restock.findMany({
      where,
      select: { id: true, createdAt: true, soldUnits: true, soldValue: true, soldCogs: true },
      orderBy: { createdAt: 'asc' },
    });

    const soldValue = restocks.reduce((a, r) => a + Number(r.soldValue), 0);
    const soldCogs = restocks.reduce((a, r) => a + Number(r.soldCogs), 0);
    const soldUnits = restocks.reduce((a, r) => a + r.soldUnits, 0);

    const lines = await this.prisma.restockLine.groupBy({
      by: ['productId'],
      where: { restock: where },
      _sum: { soldQty: true, saleValue: true, cogs: true },
    });
    const productIds = lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: { id: true, name: true, sku: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const topProducts = lines
      .map((l) => ({
        productId: l.productId,
        name: byId.get(l.productId)?.name ?? '—',
        sku: byId.get(l.productId)?.sku ?? '',
        units: Number(l._sum.soldQty ?? 0),
        value: round2(Number(l._sum.saleValue ?? 0)),
        profit: round2(Number(l._sum.saleValue ?? 0) - Number(l._sum.cogs ?? 0)),
      }))
      .filter((p) => p.units > 0)
      .sort((a, b) => b.value - a.value);

    const collections = await this.prisma.collection.aggregate({
      where: { tenantId, createdAt: { gte: from, lt: to }, ...(machineId ? { machineId } : {}) },
      _sum: { cashAmount: true, cardAmount: true },
    });
    const collected =
      Number(collections._sum.cashAmount ?? 0) + Number(collections._sum.cardAmount ?? 0);

    const wastes = await this.prisma.wasteEntry.findMany({
      where: { tenantId, createdAt: { gte: from, lt: to }, ...(machineId ? { machineId } : {}) },
      select: { quantity: true, unitCost: true },
    });
    const wasteUnits = wastes.reduce((a, w) => a + w.quantity, 0);
    const wasteCost = round2(wastes.reduce((a, w) => a + w.quantity * Number(w.unitCost), 0));

    const byDay = new Map<string, { value: number; units: number }>();
    for (const r of restocks) {
      const k = r.createdAt.toISOString().slice(0, 10);
      const cur = byDay.get(k) ?? { value: 0, units: 0 };
      cur.value += Number(r.soldValue);
      cur.units += r.soldUnits;
      byDay.set(k, cur);
    }

    const grossProfit = round2(soldValue - soldCogs);
    return {
      soldValue: round2(soldValue),
      soldCogs: round2(soldCogs),
      soldUnits,
      grossProfit,
      grossMargin: soldValue > 0 ? round2((grossProfit / soldValue) * 100) : 0,
      restockCount: restocks.length,
      collected: round2(collected),
      // + significa que se recogió MENOS de lo vendido (faltante).
      cashDifference: round2(soldValue - collected),
      wasteUnits,
      wasteCost,
      topProducts,
      daily: [...byDay.entries()].map(([date, v]) => ({
        date,
        value: round2(v.value),
        units: v.units,
      })),
    };
  }
}
