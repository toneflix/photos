# Deploying and testing the apps

The **Deploy apps** workflow (`.github/workflows/deploy-apps.yml`) ships the web app and the Android app:

- **web**: builds `apps/web` and deploys it to Cloudflare Workers.
- **android-apk**: builds an installable APK with EAS. Cloud builds are queued on EAS and the job finishes straight away with a link to the build; runner builds are attached to the workflow run.

Google Play releases run in the **Android release** workflow: [android-release.md](./android-release.md). The API has its own guide: [deploy.md](./deploy.md).

## When it runs

- **Push to `deploy`**: deploys the web app and builds the APK. The **Deploy API** workflow runs on the same push.
- **Manually**: Actions → Deploy apps → Run workflow, picking the branch. Options:

| Option | Default | What it does |
| --- | --- | --- |
| `deploy_web` | on | Deploy the web app. |
| `build_apk` | on | Build the APK (preview profile). |
| `android_builder` | `eas` | `eas` builds on Expo's servers. `runner` builds on the GitHub runner with `eas build --local`, which uses no EAS build credits and skips the EAS queue. |
| `wait_for_eas` | off | With `eas`, keep the job open until the APK is ready and attach it to the run. Off, the job queues the build and links to it in the run summary, so the runner doesn't sit idle while the build waits in the EAS queue (often 30+ minutes on the free plan). |

## Web app (Cloudflare Workers)

The worker is `toneflix-photos-web` (`apps/web/wrangler.jsonc`). The workflow runs `react-router build` and then `wrangler deploy --var API_URL:<API_URL>`, so the API address comes from the repository variable rather than the `localhost` value in `wrangler.jsonc`.

One-time setup:

1. Create a Cloudflare API token with the **Edit Cloudflare Workers** template, scoped to the Toneflix account.
2. After the first deploy, add `photos.toneflix.net` as a custom domain on the worker (Workers & Pages → toneflix-photos-web → Settings → Domains & Routes).

To deploy from your machine instead: `CLOUDFLARE_API_TOKEN=... pnpm --filter @photos/web build && cd apps/web && pnpm exec wrangler deploy --var API_URL:https://api.photos.toneflix.net/api`.

## Android (EAS)

Builds use the profiles in `apps/mobile/eas.json`:

| Profile | Output | Used for |
| --- | --- | --- |
| `development` | APK with the development client | Local development (`pnpm dev:mobile`). |
| `preview` | APK, internal distribution | The `android-apk` job: install directly on phones. |
| `production` | App Bundle, version from `app.json` | The Android release workflow. |
| `production-apk` | APK, version from `app.json` | The Android release workflow, attached to the GitHub release. |

The EAS project ID is committed in `app.json` (`extra.eas.projectId`). The workflow writes `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL` and, when set, `EAS_PROJECT_ID` and `EAS_OWNER` into the profile's `env` before building, so the app points at production and `app.config.ts` adds the `photos.toneflix.net` app links.

One-time setup:

1. The EAS project already exists: its ID is in `app.json`. To use a different project, change `extra.eas.projectId` there, or set the `EAS_PROJECT_ID` variable, which overrides it.
2. Create the Android signing key on EAS: in `apps/mobile`, run `npx eas-cli@latest credentials --platform android`, then choose to generate a new keystore. EAS keeps it, and both builders use it. Back it up from the same menu; Play App Signing needs the same upload key for every release.
3. Create an Expo access token (expo.dev → Account settings → Access tokens) and save it as the `EXPO_TOKEN` secret.
4. For Google Play:
   - Create the app in Play Console with package name `com.toneflix.photos.app`.
   - The rest of the Play setup is in [android-release.md](./android-release.md).

### Build times

- `eas`: the job takes about a minute; the build itself waits in the EAS queue and then runs on Expo's servers, with its progress on expo.dev.
- `runner`: most of the time goes on compiling C++ for each CPU architecture (about 3 minutes per architecture for the app alone, plus the native libraries). The APK is compiled for `APK_ARCHITECTURES` only, and Gradle's caches and the C++ compiler cache (ccache) are saved between runs, so builds after the first are quicker. App Bundles for Google Play always include every architecture.
- The APK job stops after 60 minutes and the Android release job after 180, so a stuck build can't hold a runner for hours.

## GitHub settings

**Secrets** (repository, or the `web-production` environment)

| Name | Needed for | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | web | Workers deploy token |
| `CLOUDFLARE_ACCOUNT_ID` | web | Cloudflare account ID |
| `EXPO_TOKEN` | android | Expo access token |

**Variables**

| Name | Needed for | Value |
| --- | --- | --- |
| `API_URL` | web, android | Public API address, e.g. `https://api.photos.toneflix.net/api` |
| `WEB_URL` | android | `https://photos.toneflix.net` (app links and share links) |
| `EAS_PROJECT_ID` | android, optional | EAS project ID, to override the one in `app.json` |
| `EAS_OWNER` | android, optional | Expo account or organisation that owns the project |
| `ANDROID_BUILDER` | android, optional | Default builder on push: `eas` or `runner` |
| `WAIT_FOR_EAS` | android, optional | `true` to wait for EAS APK builds on push and attach them to the run |
| `APK_ARCHITECTURES` | android, optional | CPU architectures for runner-built APKs (default `arm64-v8a,armeabi-v7a`, which covers 64-bit and 32-bit ARM phones; add `x86_64` for emulators) |

## Testing

### Before deploying

From the repository root:

```sh
pnpm install
pnpm typecheck
pnpm test                                  # API tests; needs PostgreSQL (docker compose up -d)
pnpm --filter @photos/web build
```

CI (`.github/workflows/ci.yml`) runs the same checks on every pull request.

### Web app

- **Locally**: `pnpm dev:web` against a local API (`pnpm dev:api`).
- **Production build in the Workers runtime**: `pnpm --filter @photos/web preview`, or `pnpm --filter @photos/web build && cd apps/web && pnpm exec wrangler dev`.
- **Check a deploy without shipping it**: `cd apps/web && pnpm exec wrangler deploy --dry-run --var API_URL:https://api.photos.toneflix.net/api` lists the bindings and bundle size.
- **After a deploy**: open photos.toneflix.net, sign in, open a book and turn a few pages. `pnpm exec wrangler tail toneflix-photos-web` streams the worker's logs. Roll back with `pnpm exec wrangler rollback` or from the worker's Deployments tab.

### Android app

- **Locally**: the app uses a development build (`expo-dev-client`) rather than Expo Go. Install one with `pnpm --filter @photos/mobile exec expo run:android`, or build it on EAS with `eas build --profile development --platform android`, then run `pnpm dev:mobile`. Press `s` in the dev server to switch to Expo Go for a quick look. Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to an address the phone can reach.
- **The APK from a workflow run**: for a cloud build, open the link in the run summary and scan the install QR code on expo.dev. For a runner build (or with `wait_for_eas`), download the `toneflix-photos-<sha>-apk` artifact (a zip), unzip it and install with `adb install app.apk`, or copy it to the phone and open it (allow installs from unknown sources).
- **What to check**: sign up and sign in, upload from the camera roll, make a book, open it and turn the phone sideways for the flipbook, unlock a book with an access code, and open a `photos.toneflix.net/books/...` link on the phone to confirm it opens in the app.
- **Google Play testing**: publish an `x.y.z-<id>` release (see [android-release.md](./android-release.md)), add testers under Play Console → Testing, and share the opt-in link.

### Testing the workflows

Run a workflow from a branch with only the parts you want: for example, Deploy apps with `deploy_web` off and `build_apk` on only builds an APK. The `deploy` branch isn't needed for manual runs.
