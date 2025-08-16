# Build stage
FROM oven/bun:1 AS builder

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Copy and prepare environment variables
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Generate Prisma client with correct binary targets
# Don't use "native" in PRISMA_CLI_BINARY_TARGETS as it causes issues
RUN bunx prisma generate

# Debug: List generated Prisma engines
RUN ls -la node_modules/.prisma/client/ || true

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS runner

# Install necessary packages for Prisma and health check
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nextjs

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy Prisma binaries and client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Set Prisma environment variables for runtime
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["bun", "server.js"]