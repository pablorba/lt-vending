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

## Despliegue

A diferencia de La Terraza (donde solo Joaquín despliega), **este sistema lo
despliega Pablo, con sus propias cuentas de Railway y Vercel** — Joaquín no
participa. Ya está publicado:

- **Web (Vercel):** https://lt-vending.vercel.app
- **API (Railway):** https://ltvapi-production.up.railway.app

Infraestructura: proyecto Railway "perfect-peace" (servicio `@ltv/api` +
Postgres), builder Dockerfile (`railway.json` + `apps/api/Dockerfile`, ya
en el repo). Proyecto Vercel con root directory `apps/web`.

**Trampas que ya nos costaron tiempo al desplegar — si se vuelve a crear el
servicio de Railway, revisar esto:**

1. Al importar el repo, Railway a veces crea un **"Custom Start Command"**
   (ej. `pnpm start`) que **ignora el `CMD` del Dockerfile** — y con eso,
   `prisma db push` nunca corre y las tablas no existen (error 500 genérico
   al primer request que toque la base). Hay que dejar ese campo **vacío**
   en Settings → Deploy.
2. `CORS_ORIGINS` debe ser el dominio pelón (`https://lt-vending.vercel.app`),
   **sin ruta** (`/login` al final, por ejemplo) — si no, el navegador
   bloquea todo con "Failed to fetch" aunque el API sí esté viva.
3. El Dockerfile usa `prisma db push` al arrancar, no migraciones
   versionadas — está bien para una base vacía, pero hay que cambiarlo a
   `prisma migrate deploy` antes de que haya datos reales de un cliente que
   no se puedan perder (ver el TODO en el Dockerfile).

Para depurar producción sin pedir capturas de pantalla: `npx @railway/cli
login` (una vez, en tu Terminal) y luego `railway link`/`railway logs`/
`railway run` desde el repo.

## Estado

- Monorepo, modelo multi-tenant (Tenant → Users → Machines → Products),
  auth por JWT (access + refresh).
- **Planograma e inventario de la máquina**: cada máquina nace con el
  planograma de 44 espirales de la máquina real de Capithal Park
  (`DEFAULT_LAYOUT`, portado de `la-terraza-pos`), pero es solo el punto de
  partida — **se puede modificar**: agregar o quitar un espiral de
  cualquier charola (nivel), agregar charolas nuevas, y el número de
  productos distintos que caben por espiral es configurable por máquina
  (`Machine.maxProductsPerSlot`, default 4 — por si el modelo de máquina es
  otro). "Quitar" un espiral lo desactiva (no borra su historial).
- **Surtido**: registrar una visita calcula lo vendido por diferencia
  (esperado − encontrado), deja el espiral con la cantidad final y guarda
  valor/costo para el dashboard.
- **Merma y dinero recogido**: para que la venta inferida no se infle con lo
  que se atora, caduca o se roban, y para cuadrar contra lo que realmente se
  recolectó.
- **Dashboard**: ventas, utilidad, margen, merma, top de productos y la
  diferencia de caja (vendido vs. recogido), últimos 30 días.
- **Pruebas**: `pnpm test` corre las de `packages/shared` (esquemas Zod) y
  `apps/api` (la matemática del surtido — vendido por diferencia, cobertura,
  validación de capacidad — extraída a funciones puras en
  `operations/restock-math.ts` justo para poder probarla sin base de datos).
  20 pruebas, todas en verde. Faltan las de servicio contra una base real
  — necesitan Docker/Postgres, no disponibles al escribir esto.

## TODO conocidos

- Definir formato de los datos DEX y cómo llegan del hardware del splitter a
  la nube (puerto DEX lo ocupa Cantaloupe Cashless — ver contexto del
  producto). Hoy el surtido se captura a mano, como en La Terraza.
- **Rutas de surtido**: pestaña creada (`/rutas`), a propósito vacía —
  "siguiente fase" — todavía no se define el proceso.
- **Planes y precios**: fuera de alcance de este sistema. Joaquín negocia el
  precio con cada cliente según cuántas máquinas mete — no va a haber
  cuota mensual/instalación fija capturada aquí.
- Despliegue real: Dockerfile y railway.json ya están listos (ver sección de
  arriba), pero nadie ha creado todavía el proyecto en Railway/Vercel ni
  corrido un deploy — necesita las credenciales de Joaquín.
- Probar el flujo completo (registro → surtir → dashboard) contra Postgres
  real: esta máquina de desarrollo no tiene Docker instalado. Build y
  typecheck sí están verificados en los 4 paquetes.
