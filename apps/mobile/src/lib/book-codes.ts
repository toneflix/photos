import { useSyncExternalStore } from 'react'
import { secureStorage } from './secure-storage'

const KEY = 'photos.book-codes'
/** How many unlocked books the app remembers. */
const LIMIT = 20

/**
 * Access codes the visitor unlocked books with, by book id. Kept in secure storage, so a book
 * stays open without retyping the code. Mirrors the web's book_codes cookie.
 */
export class BookCodes {
  private state: { ready: boolean; codes: Record<string, string> } = { ready: false, codes: {} }
  private loaded: Promise<void> | null = null
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.state

  /** Read the saved codes once. Safe to call many times. */
  load() {
    this.loaded ??= secureStorage
      .get(KEY)
      .then((value) => {
        const parsed = value ? JSON.parse(value) : {}

        this.publish(parsed && typeof parsed === 'object' ? parsed : {})
      })
      .catch(() => this.publish({}))

    return this.loaded
  }

  for(bookId: string): string | null {
    return this.state.codes[bookId] ?? null
  }

  async remember(bookId: string, code: string) {
    await this.load()

    const kept = Object.entries(this.state.codes).filter(([id]) => id !== bookId)

    await this.save(Object.fromEntries([...kept.slice(-(LIMIT - 1)), [bookId, code]]))
  }

  async forget(bookId: string) {
    await this.load()
    await this.save(Object.fromEntries(Object.entries(this.state.codes).filter(([id]) => id !== bookId)))
  }

  private async save(codes: Record<string, string>) {
    this.publish(codes)
    await secureStorage.set(KEY, JSON.stringify(codes)).catch(() => undefined)
  }

  private publish(codes: Record<string, string>) {
    this.state = { ready: true, codes }
    this.listeners.forEach((listener) => listener())
  }
}

export const bookCodes = new BookCodes()

/** The code this device unlocked a book with, or null. Undefined while the saved codes load. */
export function useBookCode(bookId: string): string | null | undefined {
  const { ready, codes } = useSyncExternalStore(bookCodes.subscribe, bookCodes.getSnapshot)

  bookCodes.load()

  return ready ? (codes[bookId] ?? null) : undefined
}
