# syntax=docker/dockerfile:1

# ============================================================
# 1. deps — install workspace dependencies (cached layer).
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/frontend/package.json packages/frontend/package.json
RUN npm install --workspace=packages/frontend

# ============================================================
# 2. build — type-check + Vite production build.
#    VITE_* vars are baked into the static bundle at build time,
#    so they're build ARGs, not runtime environment variables.
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ARG VITE_SOCKET_URL=http://localhost:3000
ARG VITE_APP_NAME="MedAssist AI"
ARG VITE_EMERGENCY_NUMBER=1122
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_EMERGENCY_NUMBER=$VITE_EMERGENCY_NUMBER

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY package.json package-lock.json* tsconfig.json ./
COPY packages/frontend packages/frontend
RUN npm run build --workspace=packages/frontend

# ============================================================
# 3. runtime — static files served by an unprivileged Nginx.
#    nginx-unprivileged runs as a non-root user out of the box and
#    listens on 8080 instead of 80, so no extra USER/permission work
#    is needed to satisfy "don't run containers as root".
# ============================================================
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
