import { PAGE_LAYOUTS, type PageLayout } from '@toneflix/flipbook-core'
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

/** A box in a layout sketch: x, y, width, height on a 12 × 16 page, then an optional turn in degrees. */
export type SketchBox = [number, number, number, number, number?]

/** A small drawing of a layout: where its photos sit and where its lines of writing run. */
export interface LayoutSketch {
  photos: SketchBox[]
  lines: SketchBox[]
}

export const LAYOUT_SKETCHES: Record<PageLayout, LayoutSketch> = {
  single: { photos: [[0, 0, 12, 16]], lines: [] },
  framed: { photos: [[2, 2, 8, 9]], lines: [[3.5, 12.5, 5, 0.8]] },
  pair: {
    photos: [
      [2, 2, 8, 5.5],
      [2, 8.5, 8, 5.5],
    ],
    lines: [],
  },
  grid: {
    photos: [
      [1.5, 1.5, 4, 6],
      [6.5, 1.5, 4, 6],
      [1.5, 8.5, 4, 6],
      [6.5, 8.5, 4, 6],
    ],
    lines: [],
  },
  collage: {
    photos: [
      [1.5, 1.5, 9, 7],
      [1.5, 9.5, 4, 5],
      [6.5, 9.5, 4, 5],
    ],
    lines: [],
  },
  text: {
    photos: [],
    lines: [
      [3, 5, 6, 0.8],
      [2, 7.5, 8, 0.8],
      [2.5, 10, 7, 0.8],
    ],
  },
  triptych: {
    photos: [
      [1, 2.5, 3, 10],
      [4.5, 2.5, 3, 10],
      [8, 2.5, 3, 10],
    ],
    lines: [[3.5, 14, 5, 0.8]],
  },
  mosaic: {
    photos: [
      [1, 1, 6, 12.5],
      [7.5, 1, 3.5, 6],
      [7.5, 7.5, 3.5, 6],
    ],
    lines: [[3.5, 14.5, 5, 0.8]],
  },
  strip: {
    photos: [
      [1, 1, 10, 4],
      [1, 5.5, 10, 4],
      [1, 10, 10, 4],
    ],
    lines: [[3.5, 14.5, 5, 0.8]],
  },
  contact: {
    photos: [
      [1, 1, 4.75, 4],
      [6.25, 1, 4.75, 4],
      [1, 5.5, 4.75, 4],
      [6.25, 5.5, 4.75, 4],
      [1, 10, 4.75, 4],
      [6.25, 10, 4.75, 4],
    ],
    lines: [[3.5, 14.5, 5, 0.8]],
  },
  scatter: {
    photos: [
      [1.2, 1.2, 6.4, 4.8, -4],
      [4.6, 5.4, 6.4, 4.8, 3],
      [1.4, 10, 5.6, 4.2, -2],
    ],
    lines: [[7.8, 12, 3, 0.8]],
  },
  story: {
    photos: [[1, 1, 10, 8]],
    lines: [
      [1.5, 10.5, 9, 0.8],
      [1.5, 12, 9, 0.8],
      [1.5, 13.5, 6, 0.8],
    ],
  },
}
