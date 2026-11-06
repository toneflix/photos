import { Book } from './Book'
import { Model } from '@arkstack/database'
import { Throttle } from '@app/support/Throttle'
import { randomInt } from 'node:crypto'

export type BookPermission = 'view' | 'add' | 'edit' | 'transfer'

export interface AccessCodeInput {
  label?: string | null
  permissions?: BookPermission[] | null
  expiresAt?: string | null
}

/**
 * A code that unlocks one book for whoever has it. Every code can open the book;
 * it may also let the holder add photos, edit pages, or claim the book as their own.
 */
export class BookAccessCode extends Model {
  declare id: string
  declare bookId: string
  declare code: string
  declare label: string | null
  declare permissions: BookPermission[]
  declare uses: number
  declare lastUsedAt: Date | null
  declare expiresAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly PERMISSIONS: BookPermission[] = ['view', 'add', 'edit', 'transfer']

  /** Wrong codes one visitor may try within GUESS_WINDOW_SECONDS before their codes stop working for a while. */
  static readonly MAX_GUESSES = 20

  static readonly GUESS_WINDOW_SECONDS = 15 * 60

  /** Letters and digits that can't be mistaken for each other when read aloud or typed. */
  static readonly ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

  protected static override table = 'book_access_codes'

  protected static override columns = {
    bookId: 'book_id',
    lastUsedAt: 'last_used_at',
    expiresAt: 'expires_at',
  }

  protected override casts = {
    permissions: 'json',
    uses: 'number',
  } as never

  book() {
    return this.belongsTo(Book, 'bookId')
  }

  /** A fresh code like `K7QM-4XTP`. */
  static generate(): string {
    const chars = Array.from({ length: 8 }, () => BookAccessCode.ALPHABET[randomInt(BookAccessCode.ALPHABET.length)])

    return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
  }

  /** The stored form of a code someone typed: upper case, grouped in fours. */
  static normalize(input: string): string {
    const chars = input.toUpperCase().replace(/[^A-Z0-9]/g, '')

    return chars.length === 8 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars
  }

  /** Every code opens the book, so `view` is always kept. */
  static permissionList(input?: BookPermission[] | null): BookPermission[] {
    const wanted = new Set<BookPermission>(['view', ...(input ?? [])])

    return BookAccessCode.PERMISSIONS.filter((permission) => wanted.has(permission))
  }

  /** Create a new code for a book. */
  static async issue(book: Book, input: AccessCodeInput): Promise<BookAccessCode> {
    let code = BookAccessCode.generate()

    while (await BookAccessCode.query().where({ code }).first()) code = BookAccessCode.generate()

    return book.codes().create({
      code,
      label: input.label?.trim() || null,
      permissions: BookAccessCode.permissionList(input.permissions),
      uses: 0,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    })
  }

  /** The unexpired code matching what someone typed, optionally only for one book. */
  static async findUsable(input: string | null | undefined, bookId?: string): Promise<BookAccessCode | null> {
    if (!input?.trim()) return null

    const query = BookAccessCode.query().where({ code: BookAccessCode.normalize(input) })

    if (bookId) query.where({ bookId })

    const found = await query.first()

    return found && !found.isExpired() ? found : null
  }

  /** Wrong codes counted against one visitor, usually their IP. */
  static guesses(visitor: string): Throttle {
    return new Throttle(`access-code:${visitor}`, BookAccessCode.MAX_GUESSES, BookAccessCode.GUESS_WINDOW_SECONDS)
  }

  /** findUsable for a code a visitor sent: wrong codes count against them, and nothing is found while they are locked out. */
  static async attempt(input: string | null | undefined, visitor: string, bookId?: string): Promise<BookAccessCode | null> {
    if (!input?.trim()) return null

    const guesses = BookAccessCode.guesses(visitor)

    if (await guesses.tooManyAttempts()) return null

    const code = await BookAccessCode.findUsable(input, bookId)

    if (!code) await guesses.hit()

    return code
  }

  isExpired(): boolean {
    return !!this.expiresAt && new Date(this.expiresAt).getTime() <= Date.now()
  }

  allows(permission: BookPermission): boolean {
    return permission === 'view' || (this.permissions ?? []).includes(permission)
  }

  /** Change the label, permissions or expiry of an existing code. */
  revise(input: AccessCodeInput): void {
    if ('label' in input) this.label = input.label?.trim() || null
    if (input.permissions) this.permissions = BookAccessCode.permissionList(input.permissions)
    if ('expiresAt' in input) this.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
  }

  /** Count someone opening the book with this code. */
  async recordUse(): Promise<void> {
    await this.update({ uses: Number(this.uses ?? 0) + 1, lastUsedAt: new Date() } as never)
  }
}
