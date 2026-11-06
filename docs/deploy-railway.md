# Deploying the API on Railway

The API (`apps/api`) can run on [Railway](https://railway.com) instead of the SSH server described in [deploy.md](./deploy.md). The web app stays on Cloudflare Workers ([deploy-apps.md](./deploy-apps.md)) and only needs `API_URL` pointed at the Railway address.

The Railway project is described with [Railway Infrastructure as Code](https://docs.railway.com/infrastructure-as-code):

- `.railway/railway.ts`: the project. A PostgreSQL database, a volume for uploads, and the `api` service built from this repository's `main` branch, with its domain and variables.
- `railpack.json`: how [Railpack](https://railpack.com) builds the image. It uses Node 24, installs the workspace with pnpm, builds only the API (`pnpm --filter @photos/api build`) and starts it with `pnpm --filter @photos/api start`. Dev dependencies stay in the image because `ark migrate` runs from source.

Each deploy builds the image, runs `ark migrate --no-interaction` as the pre-deploy command, starts the API and waits for `GET /api` to answer before switching traffic. A failed build, migration or health check leaves the previous deploy running. Only changes to the API, the shared packages or the workspace manifests trigger a build.

## One-time setup

1. **CLI**: install the [Railway CLI](https://docs.railway.com/cli) 5.42.1 or newer, then `railway login`.
2. **Project**: create an empty project in the Railway dashboard (or `railway init`), connect the Railway GitHub app to `toneflix/photos`, and run `railway link` from the repository root.
3. **Dependencies**: `pnpm install` at the root installs the `railway` package that `.railway/railway.ts` imports.
4. **Apply**: preview, then create the database, volume and service:

   ```sh
   railway config plan
   railway config apply
   ```

5. **Secrets**: the file keeps these variables with `preserve()` and gives them no value, so set them on the `api` service in the dashboard (or `railway variables --set`) before the first deploy. Later applies keep them:

   | Variable | Value |
   | --- | --- |
   | `APP_KEY` | A new key: `pnpm --filter @photos/api exec ark key:generate` locally, then copy the value |
   | `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` | The SMTP server |
   | `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API from a browser, if any |
   | `PHOTOS_DISK`, `AWS_*` | Leave empty to keep photos on the volume. Set `PHOTOS_DISK=s3` and the bucket settings to use S3, Cloudflare R2 or a Railway Bucket instead. |

   `DATABASE_URL` comes from the database. The rest (`APP_NAME`, `APP_URL`, `FRONTEND_URL`, `PORT`, `TRUST_PROXY`, `CACHE_STORE`, `QUEUE_CONNECTION`, `MAIL_TRANSPORT`, `MAIL_PORT`, `MAIL_SECURE`) have defaults in the file that apply only while the service has no value, so a value set on Railway wins. `PORT` must stay `8080` unless the domain's port in the file changes with it. `TRUST_PROXY=2` counts Railway's proxy and the web app's Worker, which forwards the visitor's IP. After the first deploy, sign in through the web app and check that Settings → Devices shows your own IP, not a Cloudflare one.

6. **Domain**: the file adds `api.photos.toneflix.net`. Add the CNAME record Railway shows for it when you move the API over.
7. **Web and mobile**: set the GitHub variable `API_URL` to `https://api.photos.toneflix.net/api` so the web and Android builds call it.

## Changing the setup

Edit `.railway/railway.ts`, then `railway config plan` and `railway config apply`. Anything removed from the file (a variable, the volume, the database) is deleted by the next apply, which asks before destructive changes. Variables the file gives a default or `preserve()` keep the value set on Railway. Other settings changed only in the dashboard are reverted by the next apply.

To run more than one replica, move photos to a bucket (a volume pins the service to one replica), add a `redis()` database and set `CACHE_STORE=redis` with its `REDIS_*` settings, so rate limits and cache are shared.

## Day to day

- **Deploy**: push to `main`.
- **Roll back**: open an earlier deploy in the service's **Deployments** tab and choose **Redeploy**. A rollback does not undo migrations.
- **Logs**: the **Deployments** tab, or `railway logs`.
- **One-off commands**: `railway ssh` into the running service, then run `pnpm exec ark <command>` (it starts in `/app/apps/api`).

When the API runs on Railway, the **Deploy API** workflow is not needed. Leave its SSH secrets unset.

## Building the image locally

With the [Railpack CLI](https://railpack.com/installation) and Docker, from the repository root:

```sh
railpack info .        # show the detected packages, steps and start command
railpack build . --name toneflix-photos-api
docker run --rm -p 3000:3000 --env-file apps/api/.env -e APP_HOST=0.0.0.0 toneflix-photos-api
```
