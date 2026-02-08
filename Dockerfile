# ------------------- Builder stage -------------------
    FROM node:20-bookworm-slim AS builder
    WORKDIR /app
    
    # Install dependencies
    COPY package*.json ./
    RUN npm ci --only=production=false   # or yarn/pnpm equivalent
    
    # Build (Next.js standalone output recommended)
    COPY . .
    RUN npm run build
    
    # ------------------- Runner stage (secure) -------------------
    FROM node:20-bookworm-slim AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # Create non-root user
    RUN groupadd --system --gid 1001 nodejs \
        && useradd --system --uid 1001 --gid nodejs --shell /bin/false nextjs \
        && mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app
    
    # Copy only what's needed (standalone output is smallest & safest)
    COPY --from=builder --chown=nextjs:nodejs /app/public ./public
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    
    USER nextjs
    
    EXPOSE 3000
    CMD ["node", "server.js"]