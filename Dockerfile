# Production Dockerfile for Fund Track App

# Use official Node.js runtime as base image - matching development version
FROM node:22-alpine AS base

# Rebuild the source code only when needed
FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# CRITICAL: Completely override any DATABASE_URL from build environment
# This prevents Dokploy from passing the real DATABASE_URL during build
ARG DATABASE_URL
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV NODE_ENV="production"
ENV SKIP_ENV_VALIDATION="true"
# Prevent Prisma from attempting any database connections during build
ENV PRISMA_CLI_BINARY_TARGETS="native"
# Disable Prisma CLI telemetry and validation during build
ENV PRISMA_CLI_TELEMETRY_DISABLED=1

# Generate Prisma client without database connection
RUN npx prisma generate

# Verify Prisma client was generated correctly
RUN ls -la node_modules/.prisma/client/
RUN ls -la src/components/auth/
RUN ls -la src/components/dashboard/
RUN ls -la src/lib/

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Create directories for logs and backups
RUN mkdir -p /app/logs /app/backups
RUN chown nextjs:nodejs /app/logs /app/backups

# Install PostgreSQL client for backups and curl for health checks
RUN apk add --no-cache postgresql-client curl

# Make entrypoint script executable
RUN chmod +x /app/scripts/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use entrypoint script to handle database setup
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]