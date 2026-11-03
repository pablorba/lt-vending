# LT Vending — instrucciones para Claude

Este archivo lo lee automáticamente cualquier sesión de Claude que abra el proyecto.

## Quiénes trabajan aquí

- **Joaquín** (dueño-operador) y **Pablo** (socio) — hermanos, los mismos de
  `la-terraza-pos`. Ninguno es desarrollador de profesión.
- Comunicación en **español de México**. Explica en términos de negocio
  (dinero, riesgo, tiempo), no técnicos. Sé directo: recomienda una opción.
- Escriben con errores de dedo; no los corrijas.

## Qué es este producto

SaaS para operadores pequeños de vending (1–20 máquinas). Ver `README.md` para
el contexto completo del producto, origen y decisiones de arquitectura de
captura de datos (hardware propio + DEX, sin pagar Seed de Cantaloupe).

Primer cliente: la máquina de vending de Capithal Park Colotlán, que hoy ya
vive **dentro de `la-terraza-pos`** (módulo `vending` de ese repo, acoplado al
inventario y la caja del food truck). Este repo es el producto nuevo,
multi-tenant, pensado para venderse a otros operadores — no un fork de ese
módulo.

## Proyectos hermanos (para estilo y convenciones, no para copiar código tal cual)

- `../la-terraza-pos` — mismo stack base (Next 14 + Nest 10 + Prisma 5 +
  pnpm/Turborepo), botones grandes táctiles, mobile-first.
- `../../finanzas-personales` ("Vault") — arquitectura de tokens de diseño
  semánticos y modo oscuro. Ver `apps/web/app/globals.css` aquí.

## Reglas que no se deben revertir (razón documentada donde se decidieron)

- **Multi-tenant desde el día uno**: todo dato de negocio cuelga de un
  `tenantId`. Nunca una query sin filtrar por tenant.
- **No inventar datos, integraciones ni cifras** (precios de planes, RFC,
  specs de hardware que no estén confirmadas). Si falta algo, deja `TODO:`
  visible en el código o en el doc, no lo rellenes con un valor creíble.

## Despliegue (solo Joaquín)

Mismas reglas que `la-terraza-pos`: subir a GitHub no publica nada. Falta
crear los proyectos en Railway (`railway.json` + `apps/api/Dockerfile` ya
listos) y Vercel (root directory `apps/web`, sin `vercel.json`) — eso lo
hace Joaquín con sus credenciales. Nunca el botón "Deploy" de Railway, nunca
`railway redeploy` ni `railway delete`. Ver README para el detalle.

## Trampas técnicas conocidas (heredadas de La Terraza, mismo stack)

- **Usa Node 22**, no Node 24: rompe Prisma 5.
- En Next.js usa `Link`, nunca `<a href>` para rutas internas.
- En NestJS, rutas estáticas del controller van antes que `:id`.
- Para refrescar varios datos en paralelo usa `Promise.allSettled`.
- La IA (cuando se agregue) nunca ejecuta SQL libre: cada herramienta es una
  consulta acotada por Prisma.

## Pruebas

- Runner nativo de Node (`node --test`), sin dependencias extra — igual que
  La Terraza.
- Contra una base local desechable (`pnpm docker:up`), nunca contra producción.

## Secretos

- Nunca contraseñas, tokens ni llaves en código ni documentos. `.env` está en
  `.gitignore`.

## Historial

- 2026-11-03 — Esqueleto inicial: monorepo, auth JWT, modelo Tenant/User/Machine,
  dashboard mínimo. (Claude Sonnet 5)
- 2026-11-03 — Planograma, surtido, merma, dinero recogido y dashboard con
  KPIs reales. Modelo de datos y lógica portados de `la-terraza-pos`
  (módulo `vending`, que ya opera la máquina real de Capithal Park) y
  adaptados a multi-tenant. Pruebas de los esquemas Zod en `packages/shared`.
  No probado contra una base real (sin Docker en la máquina donde se hizo).
  (Claude Sonnet 5)
- 2026-11-03 — Matemática del surtido extraída a funciones puras
  (`operations/restock-math.ts`) con pruebas; `railway.json` y
  `apps/api/Dockerfile` listos para cuando Joaquín despliegue. (Claude Sonnet 5)
- 2026-11-03 — Planograma editable: agregar/quitar espirales en cualquier
  charola, charolas nuevas, y `Machine.maxProductsPerSlot` configurable
  (ya no fijo en 4). Pestaña `/rutas` creada vacía a propósito — el proceso
  de rutas se define después. Confirmado: sin precios/planes en este
  sistema (Joaquín negocia por cliente); registro abierto sin invitación
  por ahora; repo público en GitHub. (Claude Sonnet 5)
