import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useWatcher } from 'alova/client'
import type { MakerItemStats, ModeratedKind } from '@photos/types'
import { licenseFor } from '@photos/types'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { StatsChart } from '@/components/stats/StatsChart'
import { type Range, RangePicker, StatTiles } from '@/components/stats/StatsParts'
import { Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { colors, fonts } from '@/theme'

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Unknown')

/** One of the maker's photos, books or spaces: its totals, its daily chart and a few details. */
export default function ItemStats() {
  const { kind, id } = useLocalSearchParams<{ kind: ModeratedKind; id: string }>()
  const [range, setRange] = useState<Range>('30')
  const { data, loading, error } = useWatcher(() => api.account.itemStats(kind, id, Number(range)), [range], { immediate: true })
  const item: MakerItemStats | undefined = data?.data

  return (
    <SettingsPage title={item?.title ?? 'Stats'} description={item ? (item.visibility === 'public' ? `Public since ${date(item.publishedAt)}.` : 'Private.') : undefined}>
      {error ? <Callout>{FormProblem.from(error).message}</Callout> : null}
      {!item && loading ? <ActivityIndicator color={colors.ink500} /> : null}
      {item ? (
        <>
          <StatTiles
            items={[
              { label: 'Views', value: item.viewCount, note: 'All time' },
              ...(item.downloadCount === null ? [] : [{ label: 'Downloads', value: item.downloadCount, note: 'All time' }]),
            ]}
          />
          {item.daily ? (
            <Section>
              <RangePicker value={range} onChange={setRange} />
              <StatsChart days={item.daily} downloads={item.downloadCount !== null} />
            </Section>
          ) : (
            <Section title="Daily charts for books come with Premium">
              <Text variant="muted">Your plan shows each book's totals. Premium adds a chart of its views and downloads day by day.</Text>
            </Section>
          )}
          <Section>
            {[...item.details, { label: 'Created', value: date(item.createdAt) }].map((detail) => (
              <View key={detail.label} style={styles.detail}>
                <Text variant="muted">{detail.label}</Text>
                <Text style={styles.value}>{detail.label === 'Licence' ? licenseFor(detail.value as never).label : detail.value}</Text>
              </View>
            ))}
          </Section>
        </>
      ) : null}
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  value: { flexShrink: 1, textAlign: 'right', fontFamily: fonts.medium, color: colors.ink900 },
})
