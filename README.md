# LT Vending — Sistema

SaaS para que operadores pequeños de vending (1 a 20 máquinas, México) controlen
sus máquinas: inventario, faltantes, ventas, utilidad, alertas y rutas de surtido.

Primer cliente y caso de prueba: la operación de vending de **Capithal Park
Colotlán** (Zapopan, Jalisco), parte de La Terraza.

## Stack

- Monorepo **pnpm** + Turborepo (mismas versiones mayores que
  [la-terraza-pos](../la-terraza-pos)).
- `apps/api` — NestJS 10 + Prisma 5 + PostgreSQL 16.
- `apps/web` — Next.js 14 (App Router) + Tailwind + Zustand.
- `packages/db` — esquema Prisma · `packages/shared` — esquemas Zod compartidos.

**Usa Node 22**, no Node 24: Node 24 rompe Prisma (lección aprendida en La Terraza).

## Diseño visual

Estilo propio sintetizado de dos proyectos hermanos:

- **La Terraza POS** — tipografía de marca, botones grandes y táctiles para
  pantallas de celular (el surtidor trabaja parado, en el pasillo).
- **Vault** (`finanzas-personales`) — arquitectura de tokens semánticos
  (`--bg`, `--surface`, `--text-muted`, `--positive`/`--warning`/`--danger`),
  soporte de modo oscuro desde el día uno y superficies planas sin sombras
  pesadas. Ver `apps/web/app/globals.css`.

No se copian colores de marca de ninguno de los dos: acento propio (verde-teal,
evoca "stock saludable").

## Arrancar en local

```bash
pnpm install
pnpm docker:up
pnpm db:push
pnpm db:seed
pnpm dev
```

Web en `http://localhost:3100`, API en `http://localhost:3101/api/v1`.

Usuario demo tras el seed: ver `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` en
`.env.example`.

## Estado

Esqueleto inicial: monorepo, modelo multi-tenant mínimo (Tenant → Users →
Machines), auth por JWT (access + refresh), y un dashboard que lista las
máquinas del operador. Sin inventario, ventas, alertas ni rutas todavía —
eso es lo que sigue.

## TODO conocidos

- Definir formato de los datos DEX y cómo llegan del hardware del splitter a
  la nube (puerto DEX lo ocupa Cantaloupe Cashless — ver contexto del
  producto).
- Procesos de surtido (rutas, tareas del surtidor).
- Planes y precios por número de máquinas (no definidos aún).
- Despliegue (Railway/Vercel, como La Terraza) — no configurado todavía.
