# ------------------- Builder stage -------------------
    FROM node:20-bookworm-slim AS builder
    WORKDIR /app
    
    # 1. Enable Corepack to detect Yarn 4 from your package.json
    RUN corepack enable
    
    # 2. Copy ALL Yarn 4 configuration files
    # You need .yarnrc.yml and the .yarn folder (which contains the yarn binary)
    COPY package.json yarn.lock* .yarnrc.yml* ./
    COPY .yarn ./.yarn
    
    # 3. If you still get error 1, try this "Debug" version of install:
    # --inline-builds will show the ACTUAL error message in the logs
    RUN yarn install --immutable --inline-builds
    
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