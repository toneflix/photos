# Book pages to print

Book owners on a plan with **Pages as a PDF** (`page_pdf`) or **Pages as images** (`page_images`) can download their book as designed, from `GET /api/books/:book/pages/download?format=pdf|images`. The API lays the book out with the flipbook library's `FlipbookPrint` in a headless browser, then saves it as one PDF or screenshots each page into a zip of PNGs. Pages are 210 × 280 mm; images are 300 DPI.

Pages are drawn in [Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/), never on the API server, so a busy day of downloads doesn't load the API with browsers. Until `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set, page downloads answer 503 and the rest of the API works as usual.

## Cloudflare Browser Run

[Browser Run](https://developers.cloudflare.com/browser-run/) (formerly Browser Rendering) runs headless Chrome on Cloudflare. The API connects to it over the Chrome DevTools Protocol and needs no Worker. It is available on Cloudflare's Free and Paid plans; see its [limits](https://developers.cloudflare.com/browser-run/limits/) for how much browser time each plan includes.

1. In the Cloudflare dashboard, copy the **Account ID** of the account that hosts the web app.
2. Create an API token under **My Profile > API Tokens > Create Token > Create Custom Token** with the permission **Account > Browser Rendering > Edit** on that account.
3. Set both on the API, then redeploy:

   ```sh
   CLOUDFLARE_ACCOUNT_ID=<account id>
   CLOUDFLARE_API_TOKEN=<token>
   ```

   These are the API's own variables, separate from the web app's own deploy, which Cloudflare runs from the dashboard ([deploy-web.md](./deploy-web.md)). On Railway, add them as service variables (`railway variables --set ...`, or in `.railway/railway.ts`). On the SSH server, add them to the API's `.env`.

The book's photos, fonts and the flipbook library are served to the remote browser from the API over the same connection, so nothing needs to be public. Each download holds one Browser Run session for a few seconds, and the session ends as soon as the file is made. Books are drawn one at a time.

Each drawn PDF and image zip is kept on the photos disk under `print-cache/books/<book id>/` until the book changes, so downloading the same book again sends the kept file and uses no Browser Run time. A file is named by a fingerprint of the laid-out book, its photo files, the print settings and the flipbook version, so changing any of them draws the book again. A book keeps one file per format, and its files are removed when the book or its owner's account is deleted.

## Settings

| Variable                 | Default                     |                                                                  |
| ------------------------ | --------------------------- | ---------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`  |                             | Browser Run account.                                             |
| `CLOUDFLARE_API_TOKEN`   |                             | Token with Browser Rendering Edit.                               |
| `CLOUDFLARE_BROWSER_URL` | Browser Run for the account | Another CDP endpoint to draw in; the tests use a local Chromium. |
| `PRINT_PAGE_WIDTH_MM`    | `210`                       | Page width; pages are 3:4.                                       |
| `PRINT_IMAGE_DPI`        | `300`                       | Resolution of page images.                                       |
| `PRINT_PHOTO_MAX_EDGE`   | `3300`                      | Longest side photos are printed at, in pixels.                   |
| `PRINT_TIMEOUT`          | `180`                       | Seconds one book may take to draw.                               |
