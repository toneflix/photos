# Toneflix Photos

A digital photo book for viewing and preserving photos for all time.

## Repository layout

This is a pnpm monorepo.

| Path | What it is |
| --- | --- |
| `apps/api` | The API, built on [Arkstack](https://arkstack.toneflix.net) (Express driver, PostgreSQL). Arkstack's filesystem module also manages photo storage. |
| `apps/web` | The web app: React Router with server-side rendering, deployed to Cloudflare Workers. |
| `apps/mobile` | The mobile app: React Native with Expo. A minimal shell for now; it is built after the web app. |
| `packages/types` | Shared domain and API response types (`@photos/types`). |
| `packages/api-client` | Shared [alova](https://alova.js.org) client and typed endpoints (`@photos/api-client`), used by web and mobile. |

## Getting started

Requirements: Node 24 (Node 22.22+ works with warnings), pnpm 10, and PostgreSQL 16 (or Docker).

```sh
pnpm install
docker compose up -d                 # PostgreSQL on localhost:5432

cp apps/api/.env.example apps/api/.env
pnpm --filter @photos/api exec ark migrate

pnpm dev:api                         # http://localhost:3000/api
pnpm dev:web                         # http://localhost:5173
pnpm dev:mobile                      # Expo dev server
```

Useful root scripts: `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm lint`.

## Configuration

- **API** (`apps/api/.env`): database, app key, mail and storage. `FILESYSTEM_DISK=local` stores photos under `apps/api/storage/app`; set it to `s3` with the `AWS_*` variables for any S3-compatible bucket (for example Cloudflare R2) in production. Disks are defined in `apps/api/src/config/filesystem.ts`. Never store file URLs in the database (S3 URLs expire): store the storage path and return a URL from `getSignedUrl()` in API responses.
- **Web** (`apps/web/wrangler.jsonc`): `API_URL` points the web app at the API. Run `pnpm --filter @photos/web cf-typegen` after changing bindings.
- **Mobile** (`apps/mobile/.env`): `EXPO_PUBLIC_API_URL`.

## Using the API client

```ts
import { createPhotosClient } from '@photos/api-client'

const { api } = createPhotosClient({ baseURL: 'http://localhost:3000/api', getToken: () => token })
const photos = await api.photos.list({ page: 1 })
```

In React components, pass `statesHook: ReactHook` (from `alova/react`) and use alova's `useRequest` / `usePagination` hooks. On the server (React Router loaders), create a client per request with `cacheFor: null`; see `apps/web/app/lib/api.server.ts`.

## Notes

- `resora` is pinned to 1.3.34 in `pnpm-workspace.yaml`: 1.3.35 breaks `@arkstack/console` 0.21.0.
