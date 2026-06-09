FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

# Disable pnpm supply-chain policy check
ENV COREPACK_ENABLE_STRICT=0
ENV PNPM_VERIFY_DEPS=false

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --no-strict-peer-dependencies

# Copy source
COPY . .

# Build frontend
RUN pnpm vite build

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start
CMD ["node", "--import", "tsx", "server/index.ts"]
