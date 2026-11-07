# Deploying the API

The API (`apps/api`) is deployed over SSH to `/var/www/api.photos.toneflix.net` by the **Deploy API** workflow (`.github/workflows/deploy-api.yml`). The workflow uploads the API's source, and the server installs, builds, migrates and restarts it. Each deploy is a separate release, so a bad deploy can be rolled back.

To run the API on Railway instead, see [deploy-railway.md](./deploy-railway.md).

## How a deploy works

1. **Check** (optional on manual runs): typecheck and test the API against a throwaway PostgreSQL, the same way CI does.
2. **Upload**: `git archive` packs the API, the shared packages and the workspace manifests, and streams the tarball to `releases/<timestamp>-<sha>.tar.gz` on the server.
3. **Release** (`.github/scripts/deploy-api.sh`, run on the server):
   - unpacks the release and links `apps/api/.env` and `apps/api/storage` to `shared/`;
   - `pnpm install --frozen-lockfile --filter '@photos/api...'`;
   - `ark build` with `NODE_ENV=production` (output in `apps/api/dist`);
   - `ark migrate` (unless migrations are skipped);
   - points `current` at the new release and restarts the API;
   - checks `http://127.0.0.1:<APP_PORT>/api` and switches back to the previous release if it doesn't answer;
   - deletes old releases, keeping the newest five (configurable).
4. **Public check**: if the `API_URL` variable is set, the workflow requests it from GitHub.

A failed install, build or migration stops before `current` changes, so the running API is untouched.

### Server layout

```
/var/www/api.photos.toneflix.net/
├── current -> releases/20261105201500-0e38a56
├── releases/
│   ├── 20261105193000-bc95783/
│   └── 20261105201500-0e38a56/
└── shared/
    ├── .env          # production settings, created by hand
    └── storage/      # uploads (local disk), logs, keys; kept across releases
```

The API runs from `current/apps/api`.

## When it runs

- **Push to `deploy`**: checks, then deploys with migrations. The **Deploy apps** workflow runs on the same push (see [deploy-apps.md](./deploy-apps.md)).
- **Manually**: Actions → Deploy API → Run workflow, picking the branch to deploy. Options:

| Option | Default | What it does |
| --- | --- | --- |
| `action` | `deploy` | `deploy` the chosen branch, or `rollback` to the release before the current one. A rollback does not undo migrations. |
| `skip_migrations` | off | Deploy without running `ark migrate`. |
| `run_checks` | on | Typecheck and test before deploying. |
| `keep_releases` | `5` | How many releases stay on the server. |

Runs never overlap: a second deploy waits for the first to finish.

## One-time server setup

1. **Software**: Node 24, pnpm 10 (`corepack enable`), [pm2](https://pm2.keymetrics.io) (`npm i -g pm2`), PostgreSQL 16, and `curl`. Node, pnpm and pm2 must be on the `PATH` of a non-interactive login shell (the workflow runs `bash -l`), so install Node system-wide or load nvm from `~/.profile` rather than `~/.bashrc`.
2. **Deploy user**: an account that owns `/var/www/api.photos.toneflix.net` and can run pm2. Add the public half of the deploy key to its `~/.ssh/authorized_keys`.
3. **Settings**: create `shared/.env` from `apps/api/.env.example`:

   ```sh
   mkdir -p /var/www/api.photos.toneflix.net/shared
   nano /var/www/api.photos.toneflix.net/shared/.env
   ```

   At least set:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `APP_URL` | Public API address, e.g. `https://api.photos.toneflix.net` |
   | `FRONTEND_URL` | `https://photos.toneflix.net` |
   | `APP_HOST`, `APP_PORT` | `127.0.0.1` and the port the reverse proxy forwards to (the health check reads `APP_PORT`, default 3000) |
   | `APP_KEY` | A new key. Generate one locally with `pnpm ark key:generate` and copy the value. |
   | `DB_*`, `DATABASE_URL` | The production database |
   | `MAIL_*` | A real SMTP server (`MAIL_TRANSPORT` other than `file`) |
   | `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API from a browser, if any |
   | `PHOTOS_DISK`, `AWS_*` | `PHOTOS_DISK=s3` and the bucket settings for S3 or Cloudflare R2. Without them photos are stored in `shared/storage`. |
   | `TRUST_PROXY` | Required behind nginx and Cloudflare. The web app calls the API from Cloudflare Workers, so without it every web visitor shares the Worker's IP and its rate limit. |
   | `CACHE_STORE` | `redis` (with the `REDIS_*` settings) if more than one API instance runs, so rate limits and cache are shared between them. `memory` is fine for a single instance. |

4. **Reverse proxy**: point nginx (or Caddy) for `api.photos.toneflix.net` at `127.0.0.1:<APP_PORT>` with TLS.
5. **pm2 on boot**: run `pm2 startup` once and follow its instructions. The first deploy starts the API as `toneflix-photos-api` and runs `pm2 save`.
6. **Scheduler** (optional): Arkstack's scheduled tasks need one cron entry for the deploy user:

   ```
   * * * * * cd /var/www/api.photos.toneflix.net/current/apps/api && pnpm exec ark schedule:run >> /dev/null 2>&1
   ```

7. **First admin**: after the first deploy, sign up on the site, then give that account the admin role from the release folder:

   ```sh
   cd /var/www/api.photos.toneflix.net/current/apps/api && pnpm exec ark users:role you@example.com admin
   ```

   From then on, admins manage roles and other accounts in the dashboard at `/admin`.

8. **Plans**: create the Free and Premium plans once. Running it again leaves existing plans as they are.

   ```sh
   cd /var/www/api.photos.toneflix.net/current/apps/api && pnpm exec ark seed PlanSeeder
   ```

   Admins then change plans and add more under Admin → Plans.

9. **Payments**: plans are paid through Flutterwave's hosted checkout. Set `FLUTTERWAVE_PUBLIC_KEY` and `FLUTTERWAVE_SECRET_KEY` in the API `.env`. In the Flutterwave dashboard, under Settings → Webhooks, set the URL to `https://api.photos.toneflix.net/api/payments/flutterwave/webhook`, pick a secret hash and put the same value in `FLUTTERWAVE_WEBHOOK_HASH`. Without a secret key, checkout says payments are not available. Payers are sent back to `FRONTEND_URL/checkout/complete`, so `FRONTEND_URL` must be the live web address.

   Regional prices are set under Admin → Plans → Payment regions. A region with no fixed rate uses the live rate from @toneflix/money (`EXCHANGE_RATES_PROVIDER`, Frankfurter by default; `exchangerate-api` also needs `EXCHANGERATE_API_KEY`) plus its markup.

## Admin settings

Upload limits, display copies, sign-ups, sign-in lockouts and book limits can be changed in the dashboard (Admin → Configuration). Each one has an env variable in `.env.example` that sets its default, and a value saved in the dashboard wins over it. Saving the same value as the env default removes the override, so the field follows `.env` again. Secrets and connection settings stay in `.env` only. With more than one API instance, use `CACHE_STORE=redis` so a saved setting reaches every instance within `SETTINGS_CACHE_SECONDS`.

## GitHub settings

Add these under Settings → Secrets and variables → Actions. Secrets can also live on the `api-production` environment, which the deploy job uses, so you can add required reviewers there.

**Secrets**

| Name | Required | Value |
| --- | --- | --- |
| `API_SSH_HOST` | yes | Server hostname or IP |
| `API_SSH_USER` | yes | Deploy user |
| `API_SSH_KEY` | yes | Private key (e.g. `ssh-keygen -t ed25519 -C deploy@toneflix-photos -N ''`) |
| `API_SSH_PORT` | no | SSH port, default 22 |
| `API_SSH_KNOWN_HOSTS` | recommended | Output of `ssh-keyscan -p <port> <host>`. Without it the workflow trusts whatever key the host presents on each run. |

**Variables**

| Name | Default | Value |
| --- | --- | --- |
| `API_DEPLOY_PATH` | `/var/www/api.photos.toneflix.net` | Deploy directory |
| `API_URL` | none | Public API address, e.g. `https://api.photos.toneflix.net/api`. Used for the public check here, and by the web and mobile builds. |
| `API_PM2_NAME` | `toneflix-photos-api` | pm2 process name |
| `API_RESTART_COMMAND` | none | Replaces the pm2 restart with your own command (run in `current/apps/api`), e.g. `sudo systemctl restart toneflix-photos-api` |

## Deploying by hand

The workflow's server script also works without GitHub, from the repository root:

```sh
release="$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short=7 HEAD)"
git archive --format=tar.gz HEAD package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json \
  packages apps/api apps/web/package.json apps/mobile/package.json \
  | ssh deploy@server "cat > /var/www/api.photos.toneflix.net/releases/$release.tar.gz"
ssh deploy@server "bash -ls -- deploy $release" < .github/scripts/deploy-api.sh
```

Roll back with `ssh deploy@server "bash -ls -- rollback" < .github/scripts/deploy-api.sh`.

## Troubleshooting

- **`Missing .../shared/.env`**: create it (step 3 above).
- **`pnpm: command not found` or `pm2: command not found`**: they are not on the login shell's `PATH`; see step 1.
- **Health check failed**: the release was rolled back automatically. Check `pm2 logs toneflix-photos-api` and `shared/storage/logs`. Make sure `APP_PORT` in `shared/.env` matches the port the API listens on.
- **A migration failed**: nothing was switched. Fix the migration and deploy again, or deploy with `skip_migrations` if the database is already up to date.
