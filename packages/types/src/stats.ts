import type { ModerationItem, ModerationItemDetail, StatsDay } from './admin'

/** How often a maker's own work is seen: totals, a daily chart and their most viewed photos, books and spaces. */
export interface MakerStats {
  photoCount: number
  bookCount: number
  spaceCount: number
  totals: { views: number; downloads: number }
  daily: StatsDay[]
  topPhotos: ModerationItem[]
  topBooks: ModerationItem[]
  topSpaces: ModerationItem[]
}

/** One of the maker's own items. `daily` is null for books when the plan has no book insights. */
export interface MakerItemStats extends Omit<ModerationItemDetail, 'daily'> {
  daily: StatsDay[] | null
}
