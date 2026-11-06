import { Book } from '@app/models/Book'
import { Cache } from '@arkstack/cache'
import { DB } from 'arkormx'
import { Photo } from '@app/models/Photo'
import { Space } from '@app/models/Space'
import type { User } from '@app/models/User'

export type CountedKind = 'photo' | 'book' | 'space'

export type Counted = Photo | Book | Space

/** Views and downloads on one day. */
export interface StatsDay {
  date: string
  views: number
  downloads: number
}

/** Which counts to add up: one item, everything one person made (`ownerId`), one kind, or everything. */
export interface StatsScope {
  kind?: CountedKind
  subjectId?: string
  ownerId?: string
}

/**
 * Views and downloads of photos, books and spaces. Each item keeps running totals,
 * and `content_stats` keeps one row per item per day for charts, filed under its maker.
 * Owners and makers don't count,
 * and one visitor counts once per item and action within VISITOR_WINDOW_SECONDS.
 */
export class ContentStats {
  static readonly VISITOR_WINDOW_SECONDS = 6 * 60 * 60

  constructor(readonly subject: Counted) {}

  /** Whose work the item is: a book's maker, else its owner. Their stats include it. */
  get makerId(): string {
    return this.subject instanceof Book ? (this.subject.creatorId ?? this.subject.userId) : this.subject.userId
  }

  get kind(): CountedKind {
    if (this.subject instanceof Photo) return 'photo'
    if (this.subject instanceof Book) return 'book'

    return 'space'
  }

  /** Count a view by `visitor` (their account id or IP). Nothing counts without one. */
  view(visitor: string | null, viewer: User | null): Promise<boolean> {
    return this.record('views', visitor, viewer)
  }

  /** Count a download by `visitor`. Spaces have nothing to download. */
  download(visitor: string | null, viewer: User | null): Promise<boolean> {
    return this.record('downloads', visitor, viewer)
  }

  /** What the item's counts show to `viewer`: always to the owner, to others only when the owner chose to show them. */
  static shown(subject: Counted, owner: User | null, viewer: User | null): { views: number; downloads: number | null } | null {
    const isOwner = !!viewer && (viewer.id === subject.userId || viewer.id === new ContentStats(subject).makerId)

    if (!isOwner && !owner?.showCounts) return null

    return { views: Number(subject.viewCount ?? 0), downloads: subject instanceof Space ? null : Number(subject.downloadCount ?? 0) }
  }

  /** A maker's views and downloads across the work they show everyone, for the maker and, when they chose to show counts, for others. */
  static async profile(maker: User, viewer: User | null): Promise<{ views: number; downloads: number } | null> {
    if (viewer?.id !== maker.id && !maker.showCounts) return null

    const photos = await maker.photos().scope('public').scope('listed').getQuery()
    const books = await maker.books().scope('public').scope('listed').getQuery()
    const spaces = await maker.spaces().where({ visibility: 'public' }).getQuery()
    const views = (await photos.sum('viewCount')) + (await books.sum('viewCount')) + (await spaces.sum('viewCount'))
    const downloads = (await photos.sum('downloadCount')) + (await books.sum('downloadCount'))

    return { views: Number(views), downloads: Number(downloads) }
  }

  /** One entry per day for the last `days` days, oldest first, with zeros on quiet days. */
  static async daily(scope: StatsScope, days = 30): Promise<StatsDay[]> {
    const { where, bindings } = ContentStats.filter(scope)
    const rows = await DB.raw<{ day: string; views: string; downloads: string }>(
      `select to_char(day, 'YYYY-MM-DD') as day, sum(views) as views, sum(downloads) as downloads
        from content_stats where day > current_date - ${Math.max(1, Math.floor(days))}::int ${where}
        group by day`,
      bindings,
    )
    const byDay = new Map(rows.all().map((row) => [row.day, row]))

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(Date.now() - (days - 1 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const row = byDay.get(date)

      return { date, views: Number(row?.views ?? 0), downloads: Number(row?.downloads ?? 0) }
    })
  }

  /** All-time views and downloads in a scope. */
  static async totals(scope: StatsScope): Promise<{ views: number; downloads: number }> {
    const { where, bindings } = ContentStats.filter(scope)
    const rows = await DB.raw<{ views: string | null; downloads: string | null }>(
      `select sum(views) as views, sum(downloads) as downloads from content_stats where true ${where}`,
      bindings,
    )
    const row = rows.all()[0]

    return { views: Number(row?.views ?? 0), downloads: Number(row?.downloads ?? 0) }
  }

  private static filter(scope: StatsScope): { where: string; bindings: unknown[] } {
    const columns: Record<keyof StatsScope, string> = { kind: 'subject_type', subjectId: 'subject_id', ownerId: 'owner_id' }
    const clauses: string[] = []
    const bindings: unknown[] = []

    for (const [key, column] of Object.entries(columns) as [keyof StatsScope, string][]) {
      if (!scope[key]) continue

      bindings.push(scope[key])
      clauses.push(`and ${column} = ?`)
    }

    return { where: clauses.join(' '), bindings }
  }

  private async record(column: 'views' | 'downloads', visitor: string | null, viewer: User | null): Promise<boolean> {
    if (!visitor || viewer?.id === this.subject.userId || viewer?.id === this.makerId) return false

    const fresh = await Cache.add(`counted:${this.kind}:${this.subject.id}:${column}:${visitor}`, true, ContentStats.VISITOR_WINDOW_SECONDS)

    if (!fresh) return false

    const total = column === 'views' ? 'view_count' : 'download_count'
    const table = { photo: 'photos', book: 'books', space: 'spaces' }[this.kind]

    await DB.raw(
      `insert into content_stats (subject_type, subject_id, owner_id, day, ${column}) values (?, ?, ?, current_date, 1)
        on conflict (subject_type, subject_id, day) do update set ${column} = content_stats.${column} + 1`,
      [this.kind, this.subject.id, this.makerId],
    )
    await DB.raw(`update ${table} set ${total} = ${total} + 1 where id = ?`, [this.subject.id])

    if (column === 'views') this.subject.viewCount = Number(this.subject.viewCount ?? 0) + 1
    else if (!(this.subject instanceof Space)) this.subject.downloadCount = Number(this.subject.downloadCount ?? 0) + 1

    return true
  }
}
