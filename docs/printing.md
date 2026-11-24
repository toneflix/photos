# Book pages to print

Book owners on a plan with **Pages as a PDF** (`page_pdf`) or **Pages as images** (`page_images`) can download their book as designed, from `GET /api/books/:book/pages/download?format=pdf|images`. The API lays the book out with the flipbook library's `FlipbookPrint` in headless Chromium, then saves it as one PDF or screenshots each page into a zip of PNGs. Pages are 210 × 280 mm; images are 300 DPI.

The API needs a Chromium to draw in. It uses the first of these it finds:

1. **Chromium on the API server** (the hosted option). `CHROMIUM_PATH` when it is set and the file exists, else `/usr/bin/chromium`, `/usr/bin/chromium-browser` or `/usr/bin/google-chrome`, else the Chromium Playwright installs.
2. **Cloudflare Browser Run**, when no local Chromium is found and `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set.

With neither, page downloads answer 503 and the rest of the API works as usual.

## Chromium on the API server

**Railway.** `railpack.json` installs Debian's `chromium` package in the deploy image (`deploy.aptPackages`), so `/usr/bin/chromium` is found with no variables. Nothing else to set up.

**SSH server** ([deploy.md](./deploy.md)). Install Chromium once:

```sh
sudo apt-get install -y chromium     # Debian
sudo apt-get install -y chromium-browser  # Ubuntu
```

If it lands somewhere else, set `CHROMIUM_PATH` to the binary in the API's `.env`.

**Local development.** `npx playwright-core install chromium` from `apps/api` downloads Playwright's own Chromium, which is found automatically. Or point `CHROMIUM_PATH` at any Chrome or Chromium you have.

Each download starts a browser for a few seconds and uses a few hundred MB of memory while it draws. Books are drawn one at a time.

## Cloudflare Browser Run

[Browser Run](https://developers.cloudflare.com/browser-run/) (formerly Browser Rendering) runs headless Chrome on Cloudflare. The API connects to it over the Chrome DevTools Protocol, so it draws the same way as a local Chromium and needs no Worker. It is available on Cloudflare's Free and Paid plans; see its [limits](https://developers.cloudflare.com/browser-run/limits/) for how much browser time each plan includes.

1. In the Cloudflare dashboard, copy the **Account ID** of the account that hosts the web app.
2. Create an API token under **My Profile > API Tokens > Create Token > Create Custom Token** with the permission **Account > Browser Rendering > Edit** on that account.
3. Set both on the API, then redeploy:

   ```sh
   CLOUDFLARE_ACCOUNT_ID=<account id>
   CLOUDFLARE_API_TOKEN=<token>
   ```

   These are the API's own variables, separate from the `CLOUDFLARE_*` GitHub secrets that deploy the web app ([deploy-apps.md](./deploy-apps.md)); one token can serve both if it has both permissions. On Railway, add them as service variables (`railway variables --set ...`, or in `.railway/railway.ts`). On the SSH server, add them to the API's `.env`.

Browser Run is only used when no local Chromium is found. To use it on Railway, leave the Chromium package out of `railpack.json` (or set `CHROMIUM_PATH` to a path that doesn't exist).

The book's photos, fonts and the flipbook library are served to the remote browser from the API over the same connection, so nothing needs to be public.

## Settings

| Variable                      | Default                       |                                                     |
| ----------------------------- | ----------------------------- | --------------------------------------------------- |
| `CHROMIUM_PATH`         | A system Chromium, if any     | The local Chromium binary.                          |
| `CLOUDFLARE_ACCOUNT_ID` |                               | Browser Run account, used when no Chromium is found. |
| `CLOUDFLARE_API_TOKEN`  |                               | Token with Browser Rendering Edit.                  |
| `PAGE_WIDTH_MM`         | `210`                         | Page width; pages are 3:4.                          |
| `IMAGE_DPI`             | `300`                         | Resolution of page images.                          |
| `PHOTO_MAX_EDGE`        | `3300`                        | Longest side photos are printed at, in pixels.      |
| `TIMEOUT`               | `180`                         | Seconds one book may take to draw.                  |
