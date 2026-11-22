# Multi-stage Dockerfile for Single-Instance BluPrnt Deployment
# Serves React Frontend + REST APIs + WebSockets on a single port (Default: 4000)

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./
COPY bluprnt-client/package*.json ./bluprnt-client/
COPY bluprnt-server/package*.json ./bluprnt-server/

# Install dependencies across all workspaces
RUN npm install

# Copy source code
COPY bluprnt-client/ ./bluprnt-client/
COPY bluprnt-server/ ./bluprnt-server/
COPY scripts/ ./scripts/

# Build client and server
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copy root manifest
COPY package.json ./
COPY bluprnt-server/package*.json ./bluprnt-server/

# Install only production dependencies
RUN cd bluprnt-server && npm install --omit=dev

# Copy compiled outputs
COPY --from=builder /app/bluprnt-client/dist ./bluprnt-client/dist
COPY --from=builder /app/bluprnt-server/dist ./bluprnt-server/dist

EXPOSE 4000

CMD ["node", "bluprnt-server/dist/index.js"]
