// Renders the Play Store feature graphic and framed phone and tablet screenshots from the app captures in screens/.
// Run from apps/mobile: node store-assets/play/source/compose.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const source = dirname(fileURLToPath(import.meta.url))
const out = resolve(source, '..')
const require = createRequire(import.meta.url)
const fonts = pathToFileURL(dirname(require.resolve('@expo-google-fonts/plus-jakarta-sans/package.json', { paths: [process.cwd()] }))).href
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), execSync('npm root -g').toString().trim()] }))
const here = pathToFileURL(source + '/').href
const logo = pathToFileURL(resolve(source, '../../../../web/public/favicon.svg')).href

const PHONE = [
  { file: 'phone-explore', bar: 'light', lines: ['Beautiful photos,', 'taken by', 'beautiful people.'], accent: 2 },
  { file: 'phone-photo', bar: 'dark', barColor: '#111c33', lines: ['Every photo,', 'front and centre.'], accent: 1 },
  { file: 'phone-book', landscape: true, bar: 'dark', barColor: '#060504', lines: ['Photobooks that feel', 'like the real thing.'], accent: 1 },
  { file: 'phone-books', bar: 'light', lines: ['Find your next', 'favourite photobook.'], accent: 1 },
  { file: 'phone-space', bar: 'light', barColor: '#f4f7fc', lines: ['A home for', 'every collection.'], accent: 1 },
  { file: 'phone-maker', bar: 'light', barColor: '#f4f7fc', lines: ['Show the world', 'what you see.'], accent: 1 },
]

const TABLET = [
  { file: 'tab-book', bar: 'dark', barColor: '#060504', lines: ['Photobooks', 'that feel', 'like the real thing.'], accent: 2 },
  { file: 'tab-photo', bar: 'dark', barColor: '#111c33', lines: ['Every photo,', 'front and centre.'], accent: 1 },
  { file: 'tab-explore', bar: 'light', lines: ['Beautiful photos,', 'taken by', 'beautiful people.'], accent: 2 },
  { file: 'tab-maker', bar: 'light', barColor: '#f4f7fc', lines: ['Show the world', 'what you see.'], accent: 1 },
]

const css = `
@font-face { font-family: Jakarta; font-weight: 800; src: url(${fonts}/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf); }
@font-face { font-family: Jakarta; font-weight: 700; src: url(${fonts}/700Bold/PlusJakartaSans_700Bold.ttf); }
@font-face { font-family: Jakarta; font-weight: 600; src: url(${fonts}/600SemiBold/PlusJakartaSans_600SemiBold.ttf); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; }
body {
  font-family: Jakarta, sans-serif; color: #fff; position: relative;
  background:
    radial-gradient(60% 45% at 50% 0%, rgba(0, 175, 255, .22), transparent 70%),
    radial-gradient(70% 50% at 50% 100%, rgba(246, 193, 1, .20), transparent 70%),
    linear-gradient(180deg, #0d1830 0%, #0a1222 55%, #070c18 100%);
}
.logo { display: block; margin: 0 auto; }
h1 { font-weight: 800; text-align: center; letter-spacing: -0.02em; line-height: 1.08; }
h1 .accent {
  background: linear-gradient(100deg, #00afff 0%, #00eaff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.device { position: absolute; background: #0b0c10; box-shadow: 0 0 0 3px #2b3242, 0 40px 120px rgba(0,0,0,.55), 0 0 160px rgba(0,175,255,.12); }
.screen { position: absolute; overflow: hidden; background: #000; }
.screen img { display: block; width: 100%; }
.bar { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
.bar.light { color: #111c33; } .bar.dark { color: #fff; }
.icons { display: flex; align-items: center; gap: .35em; }
.cam { position: absolute; border-radius: 50%; background: #05060a; box-shadow: inset 0 0 0 2px #1c2230; }
`

const icons = (size) => `<span class="icons">
  <svg width="${size * 1.1}" height="${size}" viewBox="0 0 22 20"><path d="M11 2 1 18h20z" fill="currentColor" opacity=".25"/><path d="M11 8 5 18h12z" fill="currentColor"/></svg>
  <svg width="${size * 1.1}" height="${size}" viewBox="0 0 22 20"><path d="M11 17 1.5 7a13.5 13.5 0 0 1 19 0z" fill="currentColor"/></svg>
  <svg width="${size * 1.9}" height="${size}" viewBox="0 0 38 20"><rect x="1" y="2" width="31" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/><rect x="4" y="5" width="22" height="10" rx="2" fill="currentColor"/><rect x="34" y="7" width="3" height="6" rx="1" fill="currentColor" opacity=".5"/></svg>
</span>`

const statusBar = (shot, h, font, pad) =>
  `<div class="bar ${shot.bar}" style="height:${h}px;font-size:${font}px;padding:0 ${pad}px;background:${shot.barColor || (shot.bar === 'light' ? '#ffffff' : '#000')}">
    <span>9:41</span>${icons(font * 0.9)}</div>`

const headline = (shot, size, align = 'center') =>
  `<h1 style="font-size:${size}px;text-align:${align}">${shot.lines.map((line, i) => (i === shot.accent ? `<span class="accent">${line}</span>` : line)).join('<br>')}</h1>`

const page = (body, w, h) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body style="width:${w}px;height:${h}px">${body}</body></html>`

/** A portrait phone, 1080x1920, cropped by the bottom edge like a hand-held phone. */
function phone(shot) {
  if (shot.landscape) return phoneLandscape(shot)

  const W = 1080
  const screenW = 830
  const barH = 52
  const screenH = Math.round((screenW * 892) / 412) + barH
  const bezel = 22
  const top = shot.lines.length > 2 ? 620 : 520

  return page(
    `<img class="logo" src="${logo}" style="height:92px;margin-top:84px">
    <div style="margin-top:40px">${headline(shot, shot.lines.length > 2 ? 86 : 92)}</div>
    <div class="device" style="left:${(W - screenW) / 2 - bezel}px;top:${top}px;width:${screenW + bezel * 2}px;height:${screenH + bezel * 2}px;border-radius:84px">
      <div class="screen" style="left:${bezel}px;top:${bezel}px;width:${screenW}px;height:${screenH}px;border-radius:64px">
        ${statusBar(shot, barH, 26, 52)}
        <img src="screens/${shot.file}.jpg">
      </div>
      <div class="cam" style="width:26px;height:26px;left:${screenW / 2 + bezel - 13}px;top:${bezel + 13}px"></div>
    </div>`,
    W,
    1920,
  )
}

/** Two phones turned sideways, as the app turns them for reading photobooks: a cover and an open spread. */
function phoneLandscape(shot) {
  const W = 1080
  const screenW = 960
  const screenH = Math.round((screenW * 412) / 892)
  const bezel = 18
  const sideways = (file, top, tilt) =>
    `<div class="device" style="left:${(W - screenW) / 2 - bezel}px;top:${top}px;width:${screenW + bezel * 2}px;height:${screenH + bezel * 2}px;border-radius:60px;transform:rotate(${tilt}deg)">
      <div class="screen" style="left:${bezel}px;top:${bezel}px;width:${screenW}px;height:${screenH}px;border-radius:44px"><img src="screens/${file}.jpg"></div>
      <div class="cam" style="width:20px;height:20px;left:${bezel + 12}px;top:${screenH / 2 + bezel - 10}px"></div>
    </div>`

  return page(
    `<img class="logo" src="${logo}" style="height:92px;margin-top:84px">
    <div style="margin-top:40px">${headline(shot, 92)}</div>
    ${sideways('phone-book-cover', 560, -3)}
    ${sideways(shot.file, 1100, 2)}`,
    W,
    1920,
  )
}

/** A landscape tablet, 2560x1440, headline on the left and the device running off the right edge. */
function tablet(shot) {
  const W = 2560
  const H = 1440
  const screenW = 1540
  const barH = 40
  const screenH = Math.round((screenW * 800) / 1280) + barH
  const bezel = 34
  const left = 940

  return page(
    `<div style="position:absolute;left:120px;top:0;bottom:0;width:760px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start">
      <img src="${logo}" style="height:110px;margin-bottom:56px">
      ${headline(shot, 84, 'left')}
    </div>
    <div class="device" style="left:${left}px;top:${(H - screenH) / 2 - bezel}px;width:${screenW + bezel * 2}px;height:${screenH + bezel * 2}px;border-radius:64px">
      <div class="screen" style="left:${bezel}px;top:${bezel}px;width:${screenW}px;height:${screenH}px;border-radius:30px">
        ${statusBar(shot, barH, 24, 40)}
        <img src="screens/${shot.file}.jpg">
      </div>
      <div class="cam" style="width:16px;height:16px;left:${screenW / 2 + bezel - 8}px;top:${bezel / 2 - 8}px"></div>
    </div>`,
    W,
    H,
  )
}

/** The 1024x500 feature graphic: the brand and the tagline beside an open photobook. */
function feature() {
  const bookW = 540
  const bookH = Math.round((bookW * 412) / 892)
  const bezel = 10

  return page(
    `<div style="position:absolute;inset:0;background:radial-gradient(45% 80% at 80% 55%, rgba(246,193,1,.30), transparent 70%)"></div>
    <div style="position:absolute;left:60px;top:0;bottom:0;width:440px;display:flex;flex-direction:column;justify-content:center">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:30px">
        <img src="${logo}" style="height:58px">
        <span style="font-weight:800;font-size:26px;letter-spacing:.32em">PHOTOS</span>
      </div>
      ${headline({ lines: ['Beautiful photos,', 'taken by', 'beautiful people.'], accent: 2 }, 50, 'left')}
    </div>
    <div class="device" style="left:${520 - bezel}px;top:${(500 - bookH) / 2 - bezel}px;width:${bookW + bezel * 2}px;height:${bookH + bezel * 2}px;border-radius:36px;transform:rotate(-3deg)">
      <div class="screen" style="left:${bezel}px;top:${bezel}px;width:${bookW}px;height:${bookH}px;border-radius:26px"><img src="screens/phone-book.jpg"></div>
    </div>`,
    1024,
    500,
  )
}

const browser = await chromium.launch()
const render = async (html, w, h, path) => {
  const tab = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  writeFileSync(resolve(source, '.render.html'), html)
  await tab.goto(here + '.render.html', { waitUntil: 'load' })
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path })
  await tab.close()
  console.log(path)
}

mkdirSync(`${out}/phone`, { recursive: true })
mkdirSync(`${out}/tablet`, { recursive: true })
await render(feature(), 1024, 500, `${out}/feature-graphic.png`)
for (const [i, shot] of PHONE.entries())
  await render(phone(shot), 1080, 1920, `${out}/phone/${String(i + 1).padStart(2, '0')}-${shot.file.replace('phone-', '')}.png`)
for (const [i, shot] of TABLET.entries())
  await render(tablet(shot), 2560, 1440, `${out}/tablet/${String(i + 1).padStart(2, '0')}-${shot.file.replace('tab-', '')}.png`)
await browser.close()
rmSync(resolve(source, '.render.html'), { force: true })
