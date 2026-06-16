# ==========================================
# Stage 1: Build dependencies
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

# ==========================================
# Stage 2: Runtime image
# ==========================================
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy dependencies
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copy code source
COPY . .

# Secure environment: Run as non-root user for security mitigation
RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodeuser -G nodejs && \
    chown -R nodeuser:nodejs /usr/src/app
    
USER nodeuser

EXPOSE 5000

CMD ["node", "src/index.js"]
