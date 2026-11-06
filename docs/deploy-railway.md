# Deploying the API on Railway

The API (`apps/api`) can run on [Railway](https://railway.com) instead of the SSH server described in [deploy.md](./deploy.md). The web app stays on Cloudflare Workers ([deploy-apps.md](./deploy-apps.md)) and only needs `API_URL` pointed at the Railway address.

Railway reads two files from the repository:

- `apps/api/railway.json`: build and deploy settings for the API service.
- `apps/api/Dockerfile`: the image. It installs the API's workspace dependencies, runs `ark build` and starts `node dist/server.js`. Dev dependencies stay in the image because `ark migrate` runs from source.

Each deploy builds the image, runs `ark migrate --no-interaction` as the pre-deploy command, starts the API and waits for `GET /api` to answer before switching traffic. A failed build, migration or health check leaves the previous deploy running.

## One-time setup

1. **Project**: create a Railway project and add a **PostgreSQL** database to it.
2. **API service**: add a service from the GitHub repository (`toneflix/photos`). In its settings:
   - **Root directory**: leave empty (the repository root). The API depends on `packages/*`, so the build needs the whole workspace.
   - **Config file path**: `/apps/api/railway.json`.
   - **Branch**: the branch Railway deploys on push, e.g. `deploy` or `main`.
3. **Storage**: pick one.
   - **Bucket** (recommended): add a Railway Bucket (or use Cloudflare R2 / S3) and set `PHOTOS_DISK=s3` with the `AWS_*` variables below.
   - **Volume**: attach a volume to the API service mounted at `/app/apps/api/storage`. Photos then live on the local disk and are served by the API under `/photos`. A volume pins the service to one replica.
4. **Variables**: set these on the API service.

   | Variable | Value |
   | --- | --- |
   | `APP_URL` | Public API address, e.g. `https://api.photos.toneflix.net` |
   | `FRONTEND_URL` | `https://photos.toneflix.net` |
   | `APP_KEY` | A new key: `pnpm --filter @photos/api exec ark key:generate` locally, then copy the value |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (the reference to the database service) |
   | `TRUST_PROXY` | `2`: one hop for Railway's proxy and one for the web app's Worker, which forwards the visitor's IP. Without it every web visitor shares the Worker's IP and its rate limit. After the first deploy, sign in through the web app and check that Settings → Devices shows your own IP, not a Cloudflare one. |
   | `MAIL_*` | A real SMTP server (`MAIL_TRANSPORT` other than `file`) |
   | `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API from a browser, if any |
   | `PHOTOS_DISK`, `AWS_*` | `s3` and the bucket settings, when using a bucket. For a Railway Bucket use its credentials: `AWS_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` and `AWS_ENDPOINT`. |
   | `CACHE_STORE` | `redis` (add a Redis service and set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` from it) when running more than one replica. `memory` is fine for one. |

   Do not set `PORT`, `APP_PORT` or `APP_HOST`: Railway provides `PORT` and the API listens on `0.0.0.0` by default.

5. **Domain**: under the service's **Networking**, add the custom domain `api.photos.toneflix.net` (or generate a Railway domain) and add the CNAME record Railway shows.
6. **Web and mobile**: set the GitHub variable `API_URL` to the new address with `/api` on the end, e.g. `https://api.photos.toneflix.net/api`, so the web and Android builds call it.

## Day to day

- **Deploy**: push to the branch the service tracks. Only changes to the API, the shared packages or the workspace manifests trigger a build (`watchPatterns` in `railway.json`).
- **Roll back**: open an earlier deploy in the service's **Deployments** tab and choose **Redeploy**. A rollback does not undo migrations.
- **Logs**: the service's **Deployments** tab, or `railway logs` with the [Railway CLI](https://docs.railway.com/cli).
- **One-off commands**: `railway ssh` into the running service, then run `pnpm exec ark <command>` (it starts in `/app/apps/api`).

When the API runs on Railway, the **Deploy API** workflow is not needed. Leave its SSH secrets unset and don't push to `deploy` expecting it to update Railway, unless Railway also tracks `deploy`.

## Building the image locally

From the repository root:

```sh
docker build -f apps/api/Dockerfile -t toneflix-photos-api .
docker run --rm -p 3000:3000 --env-file apps/api/.env -e APP_HOST=0.0.0.0 toneflix-photos-api
```
