# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy remaining source code
COPY . .

# Stage 2: Production
FROM node:22-alpine

# Set node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package.json and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files from builder
COPY --from=builder /usr/src/app ./

# Create a non-root user and change ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /usr/src/app

USER nodejs

# Expose port (default 5000, can be overridden by env)
EXPOSE 5000

# Add healthcheck targeting the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-5000}/health || exit 1

# Start the application
CMD ["npm", "start"]
