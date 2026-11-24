# Android releases on Google Play

The **Android release** workflow (`.github/workflows/android-release.yml`) builds an App Bundle and an APK, submits the bundle to Google Play with [r0adkll/upload-google-play](https://github.com/r0adkll/upload-google-play), and commits the published version back to the repository.

## When it runs

- **A GitHub release is published**: the tag is the version name.
- **Manually**: Actions → Android release → Run workflow.

| Option | Default | What it does |
| --- | --- | --- |
| `version` | version in `app.json` | Version name, such as `1.2.0`, `v1.2.0` or `1.2.0-beta.1`. |
| `prerelease` | off | Treat the run like a GitHub pre-release. |
| `submit` | on | Submit to Google Play. Off only builds, and nothing is committed. |
| `release_status` | `completed` | `completed`, `draft`, `inProgress` or `halted`. Use `draft` until the app's first release has been published by hand. |
| `android_builder` | `eas` | `eas` builds on Expo's servers and waits for both builds; `runner` builds on the GitHub runner. |

## Versions

- **Version name**: the release tag, with or without a leading `v` (`v1.2.0` and `1.2.0` both give `1.2.0`).
- **Version code**: `baseBuildNumber` in `apps/mobile/package.json` plus the workflow's run number. A run stops early when that isn't above the `versionCode` in `app.json`; raise `baseBuildNumber` then.
- Both live in `apps/mobile/app.json` (`expo.version`, `expo.android.versionCode`) and the mobile `package.json` `version`. EAS reads them from there (`appVersionSource: local`), so local builds (`eas build`, `pnpm android:studio`) use the version that is on the store.

After a submission the workflow commits `app.json`, `package.json` and the release notes to the release's target branch (or the branch a manual run used, else the default branch) as `github-actions[bot]`, with `[skip ci]`. Pushes made with the workflow token don't start other workflows. If the branch is protected, save a token that may push to it as the `RELEASE_PUSH_TOKEN` secret.

## Tracks

The tag's prerelease id picks the highest track, and each release also goes to every testing track below it:

| Tag | Tracks |
| --- | --- |
| `1.2.0` | production, open testing, closed testing, internal testing |
| `1.2.0-rc.1`, `1.2.0-beta.1` | open testing, closed testing, internal testing |
| `1.2.0-alpha.1` | closed testing, internal testing |
| any other id (`1.2.0-dev.1`) | internal testing |

A release marked as a pre-release on GitHub also goes to open testing, and never to production: `1.2.0` marked pre-release goes to open, closed and internal testing.

Play's track names are `production`, `beta` (open), `alpha` (closed) and `internal`. Set `PLAY_OPEN_TRACK`, `PLAY_CLOSED_TRACK` or `PLAY_INTERNAL_TRACK` to use custom tracks.

## Release notes

The workflow writes Play's "What's new" text (500 characters at most) to `apps/mobile/store-assets/play/whatsnew/whatsnew-en-US`. It takes the release body's bullet points, or the commits since the previous tag when the body has none, and keeps app features:

- `feat:` and `feat(mobile):` lines; other types (`fix`, `chore`, …) and the `admin`, `api`, `web`, `ci`, `docs`, `deps` and `build` scopes are left out.
- Lines that mention admin are left out.
- PR numbers, links and authors are removed.

To choose the notes yourself, write them as bullet points in the release body. Preview them locally from `apps/mobile` with `pnpm release:notes`, and the version and tracks for a tag with `pnpm release:plan --version 1.2.0-beta.1`.

## One-time setup

1. The steps in [deploy-apps.md](./deploy-apps.md#android-eas): EAS signing key and the `EXPO_TOKEN` secret.
2. Create the app in Play Console with package name `com.toneflix.photos.app`. Google requires the very first App Bundle to be uploaded by hand: run the workflow with `submit` off and upload the `.aab` from the run's artifacts.
3. Set `baseBuildNumber` above the highest version code already in Play Console (App bundle explorer).
4. Create a Google Cloud service account, enable the Google Play Android Developer API, and invite the account in Play Console (Users and permissions) with release permissions. Save its JSON key as the `GOOGLE_SERVICE_ACCOUNT_JSON` secret in the `play-store` environment.

**Settings**

| Name | Kind | Value |
| --- | --- | --- |
| `EXPO_TOKEN` | secret | Expo access token |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | secret | Play service account key |
| `RELEASE_PUSH_TOKEN` | secret, optional | Token that may push to a protected branch |
| `API_URL`, `WEB_URL` | variables | As in [deploy-apps.md](./deploy-apps.md) |
| `ANDROID_BUILDER` | variable, optional | Builder for release runs: `eas` (default) or `runner` |
| `PLAY_STORE_RELEASE_STATUS` | variable, optional | Release status for release runs (default `completed`) |
| `PLAY_OPEN_TRACK`, `PLAY_CLOSED_TRACK`, `PLAY_INTERNAL_TRACK` | variables, optional | Custom track names |
