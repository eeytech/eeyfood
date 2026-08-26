FROM node:22-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/gestao/package.json ./apps/gestao/
COPY apps/vendas/package.json ./apps/vendas/
COPY apps/websocket/package.json ./apps/websocket/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_SLUG
ARG NEXT_PUBLIC_ADMIN_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ARG NEXT_PUBLIC_VENDAS_URL
ARG DATABASE_URL

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_SLUG=$NEXT_PUBLIC_APP_SLUG
ENV NEXT_PUBLIC_ADMIN_API_URL=$NEXT_PUBLIC_ADMIN_API_URL
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_VENDAS_URL=$NEXT_PUBLIC_VENDAS_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PRIVATE_WORKERS=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN npm run build -w @fsw/db && npm run build -w @fsw/gestao

FROM base AS runner
WORKDIR /standalone

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3040

COPY --from=builder /app/apps/gestao/.next/standalone ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/src ./packages/db/src

EXPOSE 3040
CMD ["node", "apps/gestao/server.js"]
