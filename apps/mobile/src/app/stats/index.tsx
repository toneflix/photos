import { useState } from 'react'
import { ActivityIndicator } from 'react-native'
import { useWatcher } from 'alova/client'
import type { MakerStats } from '@photos/types'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { StatsChart } from '@/components/stats/StatsChart'
import { type Range, RangePicker, StatTiles, TopList } from '@/components/stats/StatsParts'
import { Callout } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { colors } from '@/theme'

/** How often people open and download the maker's photos, books and spaces. */
export default function StatsOverview() {
  const [range, setRange] = useState<Range>('30')
  const { data, loading, error } = useWatcher(() => api.account.stats(Number(range)), [range], { immediate: true })
  const stats: MakerStats | undefined = data?.data

  return (
    <SettingsPage title="Your stats" description="How often people view and download your photos, books and spaces.">
      {error ? <Callout>{FormProblem.from(error).message}</Callout> : null}
      {!stats && loading ? <ActivityIndicator color={colors.ink500} /> : null}
      {stats ? (
        <>
          <StatTiles
            items={[
              { label: 'Views', value: stats.totals.views, note: 'All time' },
              { label: 'Downloads', value: stats.totals.downloads, note: 'Photos and books' },
              { label: 'Photos', value: stats.photoCount },
              { label: 'Books', value: stats.bookCount },
            ]}
          />
          <Section>
            <RangePicker value={range} onChange={setRange} />
            <StatsChart days={stats.daily} />
          </Section>
          <Section title="Most viewed photos">
            <TopList items={stats.topPhotos} kind="photos" empty="No photos yet." />
          </Section>
          <Section title="Most viewed books">
            <TopList items={stats.topBooks} kind="books" empty="No books yet." />
          </Section>
          <Section title="Most viewed spaces">
            <TopList items={stats.topSpaces} kind="spaces" empty="No spaces yet." />
          </Section>
        </>
      ) : null}
    </SettingsPage>
  )
}
