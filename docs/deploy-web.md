# Deploying the web app (Cloudflare Workers)

The web app (`apps/web`) runs on the Worker `toneflix-photos-web` (`apps/web/wrangler.jsonc`). Cloudflare builds and deploys it from GitHub with Workers Builds: every push to the production branch deploys it. There is no GitHub workflow for the web app.

## One-time setup in the Cloudflare dashboard

1. **Connect the repository**: Workers & Pages → Create → Import a repository → GitHub → `toneflix/photos`. Install the Cloudflare GitHub app on the repository if asked.
2. **Project name**: `toneflix-photos-web`. It must match `name` in `apps/web/wrangler.jsonc`.
3. **Build settings**:

   | Setting | Value |
   | --- | --- |
   | Production branch | `deploy` (the API deploys from the same branch), or `main` to deploy on every merge |
   | Root directory | `apps/web` |
   | Build command | `pnpm build` |
   | Deploy command | `pnpm exec wrangler deploy --var API_URL:$API_URL` |
   | Non-production branch builds | On for a preview of each branch and pull request, or Off |

   Dependencies install automatically with pnpm, which Corepack picks from `packageManager` in the root `package.json`.
4. **Build variables** (Settings → Build → Variables and secrets):

   | Name | Value |
   | --- | --- |
   | `API_URL` | `https://api.photos.toneflix.net/api` |
   | `NODE_VERSION` | `24` |

   `API_URL` is a build variable because `wrangler deploy` replaces the Worker's runtime variables with the ones in `wrangler.jsonc` (`localhost`). Passing it with `--var` on deploy sets the production value.

   Previews of other branches run `wrangler preview`, which reads `previews.vars` in `wrangler.jsonc` instead. There is no staging API, so previews use the production API: changes made in a preview are real.
5. **Build watch paths** (Settings → Build → Build watch paths), so API-only and mobile-only pushes don't redeploy the site. Include `apps/web/*`, `packages/*`, `pnpm-lock.yaml` and `pnpm-workspace.yaml`.
6. **Custom domain**: after the first deploy, Settings → Domains & Routes → Add → Custom domain → `photos.toneflix.net`.

The Worker's other settings (compatibility date and flags, observability, source maps) come from `wrangler.jsonc` on each deploy. Change them there, not in the dashboard.

## Deploys

- **Automatic**: push to the production branch. The build log is under the Worker's Deployments tab, and GitHub shows a check run on the commit.
- **Again without a push**: Deployments → the latest build → Retry build.
- **Roll back**: Deployments → pick an earlier version → Rollback, or `pnpm exec wrangler rollback` from `apps/web`.
- **From your machine**: `pnpm deploy:web` from the repository root (after `pnpm exec wrangler login` in `apps/web`). It builds the app and deploys it with `API_URL` from your environment, or `https://api.photos.toneflix.net/api` when it isn't set.

## Checking a deploy

- **Before it ships**: `cd apps/web && pnpm exec wrangler deploy --dry-run --var API_URL:https://api.photos.toneflix.net/api` lists the bindings and bundle size.
- **After it ships**: open photos.toneflix.net, sign in, open a book and turn a few pages. `pnpm exec wrangler tail toneflix-photos-web` streams the Worker's logs.
