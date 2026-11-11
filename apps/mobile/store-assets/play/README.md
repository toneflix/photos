# Google Play listing graphics

- `feature-graphic.png`: 1024×500 feature graphic.
- `phone/`: six 1080×1920 phone screenshots, in listing order.
- `tablet/`: four 2560×1440 screenshots for both the 7-inch and 10-inch tablet slots.

`source/screens/` holds the app captures the images are built from: the Expo web build of the app at 412×892 (phone, 3×) and 1280×800 (tablet, 2×), signed in as sample accounts. Headlines live in `source/compose.mjs`. To rebuild after changing a headline or a capture, run from `apps/mobile` with Playwright installed:

```sh
node store-assets/play/source/compose.mjs
```
