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

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_SLUG=$NEXT_PUBLIC_APP_SLUG
ENV NEXT_PUBLIC_ADMIN_API_URL=$NEXT_PUBLIC_ADMIN_API_URL
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_VENDAS_URL=$NEXT_PUBLIC_VENDAS_URL

RUN npm run build -w @fsw/db && npm run build -w @fsw/gestao

FROM base AS runner
WORKDIR /standalone

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/apps/gestao/.next/standalone ./

EXPOSE 3000
CMD ["node", "apps/gestao/server.js"]
