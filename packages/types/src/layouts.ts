import { PAGE_LAYOUTS, pageSize, panoramaView, placedLayout, type PageBox, type PageLayout, type PageShape } from '@toneflix/flipbook-core'
import type { BookPageInput } from './models'

/** Spread photos over pages, mixing layouts so the book has rhythm. */
export function autoLayout(photoIds: string[]): BookPageInput[] {
  const pattern: PageLayout[] = ['single', 'framed', 'pair', 'collage', 'framed', 'grid']
  const pages: BookPageInput[] = []

  for (let i = 0, n = 0; i < photoIds.length; n++) {
    const layout = pattern[n % pattern.length]
    const count = PAGE_LAYOUTS[layout].slots

    pages.push({ layout, photoIds: photoIds.slice(i, i + count) })
    i += count
  }

  return pages
}

/** A box in a layout sketch: x, y, width, height in page units, then an optional turn in degrees. */
export type SketchBox = [number, number, number, number, number?]

/** A small drawing of a layout: the page size, where its photos sit and where its lines of writing run. */
export interface LayoutSketch {
  width: number
  height: number
  photos: SketchBox[]
  lines: SketchBox[]
}

/** The height of a line of writing in a sketch. */
const LINE = 5

const sketchBox = ({ x, y, width, height, rotate }: PageBox): SketchBox => [x, y, width, height, rotate]

/** A short centred line at the top of `box`, or a paragraph of three lines filling it. */
function writing(box: PageBox, prose = false): SketchBox[] {
  if (!prose) return [[box.x + box.width * 0.3, box.y, box.width * 0.4, LINE]]

  return [1, 1, 0.65].map((length, i) => [box.x, box.y + i * LINE * 1.8, box.width * length, LINE] as SketchBox)
}

/** Pair, grid and collage: rows of photos, or side by side on pages wider than tall. */
function columns(layout: PageLayout, width: number, height: number): SketchBox[] {
  const pad = 7
  const gap = layout === 'pair' ? 4 : 3
  const across = width > height && layout !== 'grid'
  const area = { x: pad, y: pad, width: width - 2 * pad, height: height - 2 * pad }
  const half = (box: PageBox, index: number, stacked: boolean): PageBox =>
    stacked
      ? { ...box, y: box.y + index * ((box.height + gap) / 2), height: (box.height - gap) / 2 }
      : { ...box, x: box.x + index * ((box.width + gap) / 2), width: (box.width - gap) / 2 }

  if (layout === 'grid') return [0, 1].flatMap((row) => [0, 1].map((cell) => sketchBox(half(half(area, row, true), cell, false))))
  if (layout === 'pair') return [0, 1].map((i) => sketchBox(half(area, i, !across)))

  const length = across ? area.width : area.height
  const large = ((length - gap) * 1.4) / 2.4
  const first = across ? { ...area, width: large } : { ...area, height: large }
  const rest = across ? { ...area, x: area.x + large + gap, width: length - large - gap } : { ...area, y: area.y + large + gap, height: length - large - gap }

  return [sketchBox(first), sketchBox(half(rest, 0, across)), sketchBox(half(rest, 1, across))]
}

/** Sketch a layout on a page of the given shape, from the same boxes the book draws it with. */
export function layoutSketch(layout: PageLayout, shape: PageShape = 'portrait'): LayoutSketch {
  const size = pageSize(shape)
  const { width, height } = size
  const sketch = (photos: SketchBox[], lines: SketchBox[] = []) => ({ width, height, photos, lines })
  const placed = placedLayout(layout, size)

  if (placed) return sketch(placed.slots.map(sketchBox), writing(placed.caption, placed.prose))

  switch (layout) {
    case 'single':
      return sketch([[0, 0, width, height]])
    case 'panorama': {
      // A page sketch shows the panorama whole, as a single page sets it: the spread's shape over its caption.
      const view = panoramaView(null, size)

      return sketch([sketchBox(view.photo)], typeof view.caption === 'string' ? [] : writing(view.caption))
    }
    case 'framed': {
      const photo = { x: 9, y: 10, width: width - 18, height: height - 27 }

      return sketch([sketchBox(photo)], writing({ ...photo, y: photo.y + photo.height + 5 }))
    }
    case 'text': {
      const measure = Math.min(width, 100) - 24
      const x = (width - measure) / 2
      const top = height / 2 - LINE * 2.5

      return sketch([], [0.8, 1, 0.9].map((length, i) => [x + (measure * (1 - length)) / 2, top + i * LINE * 2, measure * length, LINE] as SketchBox))
    }
    default:
      return sketch(columns(layout, width, height))
  }
}
