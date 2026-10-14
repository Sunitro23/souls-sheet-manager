FROM node:22-bookworm-slim
WORKDIR /app
ENV WRANGLER_SEND_METRICS=false CLOUDFLARE_CF_FETCH_ENABLED=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && npm run build && cp -r drizzle dist/server/migrations
RUN mkdir -p /app/.wrangler && chown -R node:node /app/.wrangler
USER node
EXPOSE 8787
CMD ["sh", "scripts/start-server.sh"]
