# ==========================================
# Stage 1: Build production React client
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

# Inject environment mocks for build compiling
ENV VITE_API_URL=/api
ENV VITE_SOCKET_URL=/

RUN npm run build

# ==========================================
# Stage 2: Serve React using Nginx
# ==========================================
FROM nginx:1.25-alpine

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["/docker-entrypoint.sh"]
