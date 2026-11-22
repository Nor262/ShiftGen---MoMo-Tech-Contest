# MoMo TrustLoop v2 — Multi-stage Production Dockerfile (Node 22 Alpine + PostgreSQL)
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholder URL so `prisma generate` and `next build` succeed without a live DB
ENV DATABASE_URL="postgresql://trustloop:trustloop@localhost:5432/trustloop?schema=public"
ENV DIRECT_URL="postgresql://trustloop:trustloop@localhost:5432/trustloop?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:postgres

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install Prisma CLI matching package.json so container startup can run `db push` idempotently
RUN npm install -g prisma@6.6.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma/schema.postgres.prisma ./prisma/schema.postgres.prisma
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["sh", "-c", "prisma db push --schema=prisma/schema.postgres.prisma --skip-generate && node server.js"]
