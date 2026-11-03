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

- Monorepo, modelo multi-tenant (Tenant → Users → Machines → Products),
  auth por JWT (access + refresh).
- **Planograma e inventario de la máquina**: cada máquina nace con su
  planograma (espirales por nivel — 44 por defecto, el layout real de la
  máquina de Capithal Park) y cada espiral puede llevar hasta 4 productos.
  Portado de la lógica ya probada en `la-terraza-pos`
  (`apps/api/src/modules/vending`), adaptado a multi-tenant.
- **Surtido**: registrar una visita calcula lo vendido por diferencia
  (esperado − encontrado), deja el espiral con la cantidad final y guarda
  valor/costo para el dashboard.
- **Merma y dinero recogido**: para que la venta inferida no se infle con lo
  que se atora, caduca o se roban, y para cuadrar contra lo que realmente se
  recolectó.
- **Dashboard**: ventas, utilidad, margen, merma, top de productos y la
  diferencia de caja (vendido vs. recogido), últimos 30 días.
- **Pruebas**: `packages/shared` tiene pruebas de los esquemas Zod
  (`pnpm test`, Node nativo). Faltan pruebas de servicio contra una base real
  — necesitan Docker/Postgres, no disponibles al escribir esto.
- Sin probar contra una base de datos real todavía (ver abajo).

## TODO conocidos

- Definir formato de los datos DEX y cómo llegan del hardware del splitter a
  la nube (puerto DEX lo ocupa Cantaloupe Cashless — ver contexto del
  producto). Hoy el surtido se captura a mano, como en La Terraza.
- Rutas de surtido (planeación de visitas, no solo el registro de cada una).
- Planes y precios por número de máquinas (no definidos aún).
- Despliegue (Railway/Vercel, como La Terraza) — no configurado todavía.
- Probar el flujo completo (registro → surtir → dashboard) contra Postgres
  real: esta máquina de desarrollo no tiene Docker instalado. Build y
  typecheck sí están verificados en los 4 paquetes.
