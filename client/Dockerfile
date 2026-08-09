# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Define build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the production bundle
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the built assets from the builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the default HTTP port
EXPOSE 80

# Add healthcheck targeting Nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
