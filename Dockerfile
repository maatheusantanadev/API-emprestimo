# ============================================================
# Dependências (todas) + Prisma Client
# ============================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# ============================================================
# Testes: docker compose --profile test run --rm tests
# ============================================================
FROM deps AS test
ENV TZ=UTC
COPY test ./test
CMD ["npm", "run", "test:all"]

# ============================================================
# Build: compila e remove dependências de desenvolvimento
# ============================================================
FROM deps AS build
RUN npm run build \
 && npm prune --omit=dev \
 && npx prisma generate

# ============================================================
# Runtime (alvo padrão): apenas dist + dependências de produção
# ============================================================
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    TZ=UTC \
    PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --start-period=20s --retries=10 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Aplica as migrations pendentes e sobe a API
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
