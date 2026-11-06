import { Book } from '@app/models/Book'
import { ContentStats } from '@app/services/ContentStats'
import type { Moderated } from '@app/services/Moderation'
import { ModerationItemResource } from './ModerationItemResource'
import { Photo } from '@app/models/Photo'

/** An item for its stats page: the list fields, a few details, and views and downloads per day. */
export class ModerationItemDetailResource extends ModerationItemResource {
  private days = 30
  private charted = true

  /** Chart the last `days` days, or leave the chart out (null) when `charted` is false. */
  over(days: number, charted = true) {
    this.days = days
    this.charted = charted

    return this
  }

  async data() {
    const item = this.resource as Moderated
    const summary = await super.data()

    return {
      ...summary,
      details: await this.details(item),
      daily: this.charted ? await ContentStats.daily({ kind: summary.kind as never, subjectId: item.id }, this.days) : null,
      createdAt: item.createdAt,
    }
  }

  /** Facts worth showing beside the chart, as label and value pairs. */
  private async details(item: Moderated): Promise<{ label: string; value: string }[]> {
    if (item instanceof Photo) {
      return [
        { label: 'Size', value: item.width && item.height ? `${item.width} × ${item.height} px` : 'Unknown' },
        { label: 'File', value: `${(item.size / 1024 / 1024).toFixed(1)} MB ${item.mimeType.replace('image/', '').toUpperCase()}` },
        { label: 'Licence', value: item.license },
      ]
    }

    if (item instanceof Book) {
      return [
        { label: 'Pages', value: String(await item.pages().count()) },
        { label: 'Theme', value: item.theme },
      ]
    }

    return [
      { label: 'Public photos', value: String(await item.contentPhotos().count()) },
      { label: 'Public books', value: String(await item.contentBooks().count()) },
      { label: 'Address', value: `/spaces/${item.slug}` },
    ]
  }
}
