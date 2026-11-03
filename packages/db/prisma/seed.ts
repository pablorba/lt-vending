import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  const existingMachine = await prisma.machine.findFirst({ where: { tenantId: tenant.id } });
  if (!existingMachine) {
    await prisma.machine.create({
      data: {
        tenantId: tenant.id,
        name: 'AMS VISI Combo 39"',
        location: 'Capithal Park Colotlán, Zapopan',
        notes: 'Primera máquina — monedero, billetero y terminal Cantaloupe (PAX IM30).',
      },
    });
  }

  console.log('Seed listo:');
  console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`  Owner:  ${owner.email} / ${ownerPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
