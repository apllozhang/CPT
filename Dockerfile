FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

# Install dependencies using npm (avoids pnpm policy issues)
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9 && pnpm install --no-frozen-lockfile --no-strict-peer-dependencies

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
