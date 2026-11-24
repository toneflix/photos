# Book pages to print

Book owners on a plan with **Pages as a PDF** (`page_pdf`) or **Pages as images** (`page_images`) can download their book as designed, from `GET /api/books/:book/pages/download?format=pdf|images`. Pages are 210 × 280 mm; images are 300 DPI.

The API draws the pages itself with `@toneflix/flipbook-print`, which lays the book out exactly as the reader does and draws it with Skia, without a browser. It needs no setup or outside service. The PDF keeps text and rules as vectors and embeds each photo once; images are PNGs in a zip, named in reading order. Photos print from their originals, scaled down to `PRINT_PHOTO_MAX_EDGE`. Books are drawn one at a time.

Each drawn PDF and image zip is kept on the photos disk under `print-cache/books/<book id>/` until the book changes, so downloading the same book again sends the kept file. A file is named by a fingerprint of the laid-out book, its photo files, the print settings and the flipbook version, so changing any of them draws the book again. A book keeps one file per format, and its files are removed when the book or its owner's account is deleted.

## Settings

| Variable               | Default |                                                |
| ---------------------- | ------- | ---------------------------------------------- |
| `PRINT_PAGE_WIDTH_MM`  | `210`   | Page width; pages are 3:4.                     |
| `PRINT_IMAGE_DPI`      | `300`   | Resolution of page images.                     |
| `PRINT_PHOTO_MAX_EDGE` | `3300`  | Longest side photos are printed at, in pixels. |
