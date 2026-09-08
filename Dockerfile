FROM oven/bun:1.3.14 AS bun

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends g++ make python3 && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN node node_modules/next/dist/bin/next build --webpack

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/app ./app
COPY --chown=node:node --from=build /app/components ./components
COPY --chown=node:node --from=build /app/drizzle ./drizzle
COPY --chown=node:node --from=build /app/lib ./lib
COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/scripts ./scripts
COPY --chown=node:node --from=build /app/package.json /app/next.config.ts /app/tsconfig.json /app/drizzle.config.ts ./
USER node
EXPOSE 3050
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3050/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "scripts/start-hosted.mjs"]
