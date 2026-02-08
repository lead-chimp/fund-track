# ------------------- Builder stage -------------------
    FROM node:20-bookworm-slim AS builder
    WORKDIR /app
    
    # Enable Corepack to use the version of Yarn specified in your package.json
    RUN corepack enable
    
    # Copy lockfile and package.json first for layer caching
    COPY package.json yarn.lock* ./
    
    # Install dependencies (frozen-lockfile ensures no dev-only changes)
    # RUN yarn install --frozen-lockfile

    # IF you are using Yarn 2/3/4 (Berry), use:
    RUN yarn install --immutable
    
    # Copy source and build
    COPY . .
    RUN yarn build
    
    # ------------------- Runner stage (secure) -------------------
    FROM node:20-bookworm-slim AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # Create non-root user
    RUN groupadd --system --gid 1001 nodejs \
        && useradd --system --uid 1001 --gid nodejs --shell /bin/false nextjs \
        && mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app
    
    # Copy only standalone output
    COPY --from=builder --chown=nextjs:nodejs /app/public ./public
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    
    USER nextjs
    
    EXPOSE 3000
    CMD ["node", "server.js"]