FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY . .
RUN npm run build

FROM deps AS dev
COPY . .
USER node
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
    CMD wget -qO- http://127.0.0.1:5173/ > /dev/null || exit 1
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
    CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1