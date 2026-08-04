# syntax=docker/dockerfile:1

# ============================================================
# 1. deps — install full (dev+prod) workspace dependencies once,
#    cached separately so source edits don't bust npm install.
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/backend/package.json packages/backend/package.json
RUN npm install --workspace=packages/backend

# ============================================================
# 2. build — compile TypeScript to dist/.
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY package.json package-lock.json* tsconfig.json ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/backend/tsconfig.json packages/backend/tsconfig.json
COPY packages/backend/src packages/backend/src
RUN npm run build --workspace=packages/backend

# ============================================================
# 3. prod-deps — production-only node_modules (no ts-jest, eslint, etc.)
# ============================================================
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/backend/package.json packages/backend/package.json
RUN npm install --workspace=packages/backend --omit=dev

# ============================================================
# 4. runtime — the image that actually ships.
# ============================================================
FROM node:20-alpine AS runtime
WORKDIR /app

# Python is required for the scikit-learn symptom-prediction bridge
# (services/python.service.ts spawns ml/predict.py).
RUN apk add --no-cache python3 py3-pip dumb-init \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir scikit-learn pandas joblib
ENV PATH="/opt/venv/bin:$PATH"

# pm2-runtime: PM2's foreground process manager, built for containers —
# forwards signals and doesn't daemonize, unlike plain `pm2 start`.
RUN npm install -g pm2

ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/backend/ecosystem.config.js ./packages/backend/ecosystem.config.js
COPY packages/backend/ml ./packages/backend/ml

# Run as a non-root user rather than the default root.
RUN addgroup -S medassist && adduser -S medassist -G medassist \
    && mkdir -p /app/packages/backend/logs /app/packages/backend/uploads \
    && chown -R medassist:medassist /app/packages/backend
USER medassist

WORKDIR /app/packages/backend
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
