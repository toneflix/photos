# Toneflix Photos

Personalised and interactive photo books.

## Repository layout

This is a pnpm monorepo.

| Path | What it is |
| --- | --- |
| `apps/api` | The API, built on [Arkstack](https://arkstack.toneflix.net) (Express driver, PostgreSQL). Arkstack's filesystem module also manages photo storage. |
| `apps/web` | The web app: React Router with server-side rendering, deployed to Cloudflare Workers. |
| `apps/mobile` | The mobile app: React Native with Expo and Expo Router (`src/app`). It is catching up with the web app phase by phase. |
| `packages/types` | Shared domain and API response types (`@photos/types`). |
| `packages/api-client` | Shared [alova](https://alova.js.org) client and typed endpoints (`@photos/api-client`), used by web and mobile. |

## Getting started

Requirements: Node 24 (Node 22.22+ works with warnings), pnpm 10, and PostgreSQL 16 (or Docker).

```sh
pnpm install
docker compose up -d                 # PostgreSQL on localhost:5432

cp apps/api/.env.example apps/api/.env
pnpm ark migrate

pnpm dev:api                         # http://localhost:3000/api
pnpm dev:web                         # http://localhost:5173
pnpm dev:mobile                      # Expo dev server
```

Useful root scripts: `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm lint`.

## What's in the app

- **Sign up / sign in** (`/signup`, `/signin`). The API token is kept in an httpOnly cookie; loaders and actions call the API on the user's behalf.
- **Photo library** (`/photos`): drag-and-drop uploads (up to 25 MB each), captions, delete.
- **Books** (`/books`): a shelf of covers; create a book with a cover style (classic, linen, midnight).
- **Book editor** (`/books/:id/edit`): add, reorder and delete pages, pick a layout and a printed photo frame per page (full bleed, framed, pair, grid), place photos, write captions, choose a cover photo and share by link. Changes save automatically.
- **Flipbook viewer** (`/books/:id`): a two-page spread with 3D page turns (click, swipe, or arrow keys). On phones held upright it asks the reader to turn the phone sideways and offers full screen, which also locks landscape where the browser allows it (Chrome on Android). Readers can choose single pages instead. Shared books open without signing in.
- **Full-screen link** (`/books/:id/view`): the same viewer, made for sharing. The first tap or key press takes it full screen. Book settings and access-code share links use it.

### API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Returns `{ user, token }` |
| GET | `/api/auth/me` | |
| POST | `/api/auth/logout` | |
| GET, POST | `/api/photos` | List (paginated) / upload (multipart field `photo`, optional `width`, `height`, `caption`, `takenAt`) |
| GET, PUT, DELETE | `/api/photos/:photo` | |
| GET, POST | `/api/books` | |
| GET | `/api/books/:book` | Book with every page. Works signed out for shared books. |
| PUT, DELETE | `/api/books/:book` | |
| PUT | `/api/books/:book/pages` | Replaces all pages: `{ pages: [{ layout, caption, photoIds }] }` |

## Configuration

- **API** (`apps/api/.env`): database, app key, mail and storage. In development photos go to the local `public` disk (`apps/api/storage/app/public`) and `getSignedUrl()` points at `APP_URL/photos/...`, which the API serves. In production set `PHOTOS_DISK=s3` with the `AWS_*` variables for any S3-compatible bucket (for example Cloudflare R2). Disks are defined in `apps/api/src/config/filesystem.ts`. Never store file URLs in the database (S3 URLs expire): store the storage path and return a URL from `getSignedUrl()` in API responses.
- **Web** (`apps/web/wrangler.jsonc`): `API_URL` points the web app at the API. Run `pnpm --filter @photos/web cf-typegen` after changing bindings.
- **Mobile** (`apps/mobile/.env`): `EXPO_PUBLIC_API_URL`, and `EXPO_PUBLIC_WEB_URL` (https) so the reset-password and verify-email links in emails open the app. The token is kept in the device keychain (`expo-secure-store`) and sessions are named after the device via Arkstack's `X-Device-Agent` header. For a quick preview in the browser, run `pnpm --filter @photos/mobile web` and add its origin to the API's `CORS_ALLOWED_ORIGINS`.

## Deploying

Pushing to the `deploy` branch deploys the API over SSH, deploys the web app to Cloudflare Workers and builds an Android APK. Both workflows can also be run by hand with options. See [docs/deploy.md](docs/deploy.md) for the API and [docs/deploy-apps.md](docs/deploy-apps.md) for the web and Android apps, including how to test them. The API can also run on Railway: see [docs/deploy-railway.md](docs/deploy-railway.md).

## Using the API client

```ts
import { createPhotosClient } from '@photos/api-client'

const { api } = createPhotosClient({ baseURL: 'http://localhost:3000/api', getToken: () => token })
const photos = await api.photos.list({ page: 1 })
```

In React components, pass `statesHook: ReactHook` (from `alova/react`) and use alova's `useRequest` / `usePagination` hooks. On the server (React Router loaders), create a client per request with `cacheFor: null`; see `apps/web/app/lib/api.server.ts`.
