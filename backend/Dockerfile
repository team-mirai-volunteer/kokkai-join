# Multi-stage build for Node.js backend optimized for Google Cloud Run Gen2

# Stage 1: Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Stage 2: Production stage
FROM node:24-slim AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Cloud Run expects the app to listen on the PORT environment variable
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run will set PORT dynamically)
EXPOSE 8080

# Run the application
CMD ["node", "dist/server.js"]
