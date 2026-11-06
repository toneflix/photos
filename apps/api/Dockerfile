# API image, built from the repository root: docker build -f apps/api/Dockerfile .
FROM node:24-slim

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages packages
COPY apps/api apps/api

# Dev dependencies stay installed: `ark migrate` runs from source before each deploy.
RUN pnpm install --frozen-lockfile --filter '@photos/api...'

WORKDIR /app/apps/api

ENV NODE_ENV=production

RUN pnpm exec ark build

CMD ["node", "dist/server.js"]
