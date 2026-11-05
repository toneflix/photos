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
