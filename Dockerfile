# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install curl for health checks and MinIO (auto-detect architecture)
RUN apk add --no-cache curl && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; elif [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && \
    wget https://dl.min.io/server/minio/release/linux-${ARCH}/minio -O /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio

# Create MinIO data directory
RUN mkdir -p /data

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'minio server /data --address ":9000" --console-address ":9001" &' >> /start.sh && \
    echo 'sleep 5' >> /start.sh && \
    echo 'cd /usr/src/app && pnpm start' >> /start.sh && \
    chmod +x /start.sh

# Set environment variables for MinIO connection
ENV MINIO_ENDPOINT=localhost
ENV MINIO_PORT=9000
ENV MINIO_USE_SSL=false
ENV MINIO_ACCESS_KEY=minioadmin
ENV MINIO_SECRET_KEY=minioadmin123

# Expose ports
EXPOSE 3001 9000 9001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start both MinIO and the application
CMD ["/start.sh"]