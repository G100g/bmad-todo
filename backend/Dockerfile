FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build:ts

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache curl
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
    CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1
CMD ["npx", "fastify", "start", "-l", "info", "dist/app.js"]