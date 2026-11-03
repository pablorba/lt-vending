# Dockerfile para el backend de LT Vending (NestJS + Prisma + pnpm monorepo)
# Diseñado para deploy en Railway. Multi-stage para minimizar el tamaño final.
# Calcado del Dockerfile de la-terraza-pos (mismo stack, mismo monorepo).

# ============================================================================
# Base: imagen ligera con pnpm
# ============================================================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@9.12.0
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

# ============================================================================
# Dependencies: instala todas las deps del workspace
# ============================================================================
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
# apps/web también está en el workspace; necesario para satisfacer el lockfile
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ============================================================================
# Build: compila shared, genera Prisma client, compila api
# ============================================================================
FROM deps AS build
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN cd packages/db && pnpm exec prisma generate

RUN pnpm --filter @ltv/shared build
RUN pnpm --filter @ltv/db build
RUN pnpm --filter @ltv/api build

# Nota: no usamos `pnpm prune --prod` porque rompe los enlaces simbólicos de
# pnpm en monorepos. La imagen queda algo más grande pero funcional.

# ============================================================================
# Runtime: imagen mínima de producción
# ============================================================================
FROM base AS runtime
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/package.json ./

# Railway provee la variable PORT. NestJS la lee.
ENV PORT=3101
EXPOSE 3101

# TODO: cuando haya datos reales en producción, cambiar `prisma db push` por
# migraciones versionadas (`prisma migrate deploy` contra una carpeta
# prisma/migrations generada con `prisma migrate dev`) — "db push" puede
# perder datos en un cambio destructivo sin que nadie lo revise primero.
# Por ahora, para una base vacía/de arranque, está bien.
CMD ["sh", "-c", "cd packages/db && pnpm exec prisma db push --skip-generate && cd /app/apps/api && node dist/main.js"]
