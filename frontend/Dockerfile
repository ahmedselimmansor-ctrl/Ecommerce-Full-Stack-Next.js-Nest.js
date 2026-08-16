# syntax=docker/dockerfile:1
# Next.js standalone build for Cloud Run.
#
# NEXT_PUBLIC_* values are inlined at build time, so they arrive as build args
# rather than runtime environment variables. Server-only values (API_URL) stay
# runtime variables and are set on the Cloud Run service.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CURRENCY=EGP
ARG NEXT_PUBLIC_LOCALE=en-EG
ARG NEXT_PUBLIC_GCS_BUCKET
ARG NEXT_PUBLIC_FREE_SHIPPING_CENTS=150000
ARG NEXT_PUBLIC_FLAT_SHIPPING_CENTS=6000

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CURRENCY=$NEXT_PUBLIC_CURRENCY \
    NEXT_PUBLIC_LOCALE=$NEXT_PUBLIC_LOCALE \
    NEXT_PUBLIC_GCS_BUCKET=$NEXT_PUBLIC_GCS_BUCKET \
    NEXT_PUBLIC_FREE_SHIPPING_CENTS=$NEXT_PUBLIC_FREE_SHIPPING_CENTS \
    NEXT_PUBLIC_FLAT_SHIPPING_CENTS=$NEXT_PUBLIC_FLAT_SHIPPING_CENTS \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini \
    && addgroup -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs nextjs

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
# `standalone` already contains a minimal node_modules with only what is used.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
