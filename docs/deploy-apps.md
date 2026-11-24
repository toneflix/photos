# Deploying and testing the apps

- **Web app**: Cloudflare builds and deploys it from GitHub (Workers Builds), set up in the Cloudflare dashboard: [deploy-web.md](./deploy-web.md).
- **Android app**: the **Android release** workflow builds the App Bundle and an APK and submits to Google Play: [android-release.md](./android-release.md). Run it with `submit` off to only build; the APK is in the run's artifacts.

The API has its own guide: [deploy.md](./deploy.md).

## Android (EAS)

Builds use the profiles in `apps/mobile/eas.json`:

| Profile | Output | Used for |
| --- | --- | --- |
| `development` | APK with the development client | Local development (`pnpm dev:mobile`). |
| `preview` | APK, internal distribution | Test builds by hand: `eas build --profile preview --platform android`. |
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

- `eas`: the build waits in the EAS queue (often 30+ minutes on the free plan) and then runs on Expo's servers, with its progress on expo.dev.
- `runner`: most of the time goes on compiling C++ for each CPU architecture (about 3 minutes per architecture for the app alone, plus the native libraries). Gradle's caches and the C++ compiler cache (ccache) are saved between runs, so builds after the first are quicker.
- The Android release job stops after 180 minutes, so a stuck build can't hold a runner for hours.

## GitHub settings

**Secrets**

| Name | Needed for | Value |
| --- | --- | --- |
| `EXPO_TOKEN` | android | Expo access token |

**Variables**

| Name | Needed for | Value |
| --- | --- | --- |
| `API_URL` | android | Public API address, e.g. `https://api.photos.toneflix.net/api` |
| `WEB_URL` | android | `https://photos.toneflix.net` (app links and share links) |
| `EAS_PROJECT_ID` | android, optional | EAS project ID, to override the one in `app.json` |
| `EAS_OWNER` | android, optional | Expo account or organisation that owns the project |
| `ANDROID_BUILDER` | android, optional | Default builder for release runs: `eas` or `runner` |

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
- **Deploys, checks and rollbacks**: [deploy-web.md](./deploy-web.md).

### Android app

- **Locally**: the app uses a development build (`expo-dev-client`) rather than Expo Go. Install one with `pnpm --filter @photos/mobile exec expo run:android`, or build it on EAS with `eas build --profile development --platform android`, then run `pnpm dev:mobile`. Press `s` in the dev server to switch to Expo Go for a quick look. Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to an address the phone can reach.
- **The APK from a workflow run**: download the `toneflix-photos-<version>-<code>` artifact of an Android release run (a zip), unzip it and install the `.apk` with `adb install`, or copy it to the phone and open it (allow installs from unknown sources). Published releases also have the APK attached on GitHub.
- **What to check**: sign up and sign in, upload from the camera roll, make a book, open it and turn the phone sideways for the flipbook, unlock a book with an access code, and open a `photos.toneflix.net/books/...` link on the phone to confirm it opens in the app.
- **Google Play testing**: publish an `x.y.z-<id>` release (see [android-release.md](./android-release.md)), add testers under Play Console → Testing, and share the opt-in link.
