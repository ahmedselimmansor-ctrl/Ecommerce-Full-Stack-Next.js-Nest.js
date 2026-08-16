# syntax=docker/dockerfile:1
# Multi-stage build for Cloud Run. The final image ships only production
# dependencies, the compiled dist/ and the generated Prisma client.

# ---- full dependency tree (needed to compile) --------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ---- production-only dependency tree ----------------------------------------
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts

# ---- compile ----------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl tini \
    && addgroup -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs nestjs

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=prod-deps /app/node_modules ./node_modules
# The Prisma client is code-generated, so it is copied rather than reinstalled.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nestjs
EXPOSE 8080

# tini reaps zombies and forwards SIGTERM so Cloud Run drains connections cleanly.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
