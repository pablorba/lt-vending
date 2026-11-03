import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Mismo layout por defecto que packages/shared/src/schemas/machine.ts
// (DEFAULT_LAYOUT) — duplicado aquí porque el seed corre con el cliente
// Prisma puro, sin pasar por la API. Si cambia uno, cambia el otro.
const DEFAULT_LAYOUT: number[][] = [
  [9, 9, 9, 9, 9],
  [12, 12, 12, 15, 15],
  [10, 12, 15, 15, 15, 15, 18, 18, 18, 24],
  [6, 6, 6, 6, 6, 6, 6, 6],
  [6, 6, 6, 6, 6, 6, 6, 6],
  [6, 6, 6, 6, 6, 6, 6, 6],
];

async function main() {
  const tenantName = process.env.SEED_TENANT_NAME ?? 'Capithal Park Colotlán';
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? 'admin@ltvending.local';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'admin1234';

  const slug = tenantName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { name: tenantName, slug },
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      tenantId: tenant.id,
      email: ownerEmail,
      passwordHash,
      name: 'Operador demo',
      role: UserRole.OWNER,
    },
  });

  // Productos de ejemplo. TODO: precios reales — estos son solo para probar
  // el flujo, no son los precios que se cobran en la máquina.
  const sampleProducts = [
    { name: 'Agua 600ml', sku: 'AGU600', price: 18, cost: 9 },
    { name: 'Refresco 355ml', sku: 'REF355', price: 22, cost: 11 },
    { name: 'Papas fritas 45g', sku: 'PAP045', price: 20, cost: 10 },
    { name: 'Chocolate', sku: 'CHO001', price: 22, cost: 11 },
  ];
  const products = [];
  for (const p of sampleProducts) {
    const existing = await prisma.product.findFirst({ where: { tenantId: tenant.id, sku: p.sku } });
    products.push(
      existing ??
        (await prisma.product.create({
          data: { tenantId: tenant.id, name: p.name, sku: p.sku, price: p.price, cost: p.cost },
        })),
    );
  }

  let machine = await prisma.machine.findFirst({ where: { tenantId: tenant.id } });
  if (!machine) {
    machine = await prisma.$transaction(async (tx) => {
      const m = await tx.machine.create({
        data: {
          tenantId: tenant.id,
          name: 'AMS VISI Combo 39"',
          location: 'Capithal Park Colotlán, Zapopan',
          notes: 'Primera máquina — monedero, billetero y terminal Cantaloupe (PAX IM30).',
        },
      });

      const slotsData = DEFAULT_LAYOUT.flatMap((row, li) =>
        row.map((capacity, pi) => ({
          tenantId: tenant.id,
          machineId: m.id,
          level: li + 1,
          position: pi + 1,
          code: `${li + 1}-${String(pi + 1).padStart(2, '0')}`,
          capacity,
        })),
      );
      await tx.slot.createMany({ data: slotsData });

      return m;
    });

    // Carga de ejemplo: los primeros dos espirales del nivel 1 con producto
    // y algo de stock, para que el planograma no se vea vacío al entrar.
    const firstSlots = await prisma.slot.findMany({
      where: { machineId: machine.id, level: 1 },
      orderBy: { position: 'asc' },
      take: 2,
    });
    for (let i = 0; i < firstSlots.length; i++) {
      await prisma.slotItem.create({
        data: { slotId: firstSlots[i].id, productId: products[i].id, currentQty: firstSlots[i].capacity },
      });
    }
  }

  console.log('Seed listo:');
  console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`  Owner:  ${owner.email} / ${ownerPassword}`);
  console.log(`  Máquina: ${machine.name} (${DEFAULT_LAYOUT.flat().length} espirales)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
