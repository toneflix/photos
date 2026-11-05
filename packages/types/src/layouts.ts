import type { BookPageInput, PageLayout } from './models'

/** Spread photos over pages, mixing layouts so the book has rhythm. */
export function autoLayout(photoIds: string[]): BookPageInput[] {
  const pattern: [PageLayout, number][] = [
    ['single', 1],
    ['framed', 1],
    ['pair', 2],
    ['collage', 3],
    ['framed', 1],
    ['grid', 4],
  ]
  const pages: BookPageInput[] = []

  for (let i = 0, n = 0; i < photoIds.length; n++) {
    const [layout, count] = pattern[n % pattern.length]

    pages.push({ layout, photoIds: photoIds.slice(i, i + count) })
    i += count
  }

  return pages
}
