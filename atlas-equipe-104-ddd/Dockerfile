FROM node:24-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client ./
COPY common /app/common
RUN npm run build

FROM node:24-bookworm-slim AS server-build
WORKDIR /app/server-nestjs
COPY server-nestjs/package*.json ./
RUN npm ci --no-audit --no-fund
COPY server-nestjs ./
COPY common /app/common
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS api
ENV NODE_ENV=production PORT=3000
WORKDIR /app/server-nestjs
COPY --from=server-build /app/server-nestjs/node_modules ./node_modules
COPY --from=server-build /app/server-nestjs/out ./out
USER node
EXPOSE 3000
CMD ["node", "out/server-nestjs/app/index.js"]

FROM nginx:1.28-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/client/dist/client /usr/share/nginx/html
EXPOSE 80
