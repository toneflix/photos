import { Image, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ModerationItem } from '@photos/types'
import { Segmented } from '@/components/Segmented'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

const number = new Intl.NumberFormat('en')

/** How far back a chart can look, in days. */
export const RANGES = ['7', '30', '90'] as const

export type Range = (typeof RANGES)[number]

export function RangePicker({ value, onChange }: { value: Range; onChange: (value: Range) => void }) {
  return <Segmented options={RANGES.map((range) => ({ value: range, label: `${range} days` }))} value={value} onChange={onChange} />
}

/** Big numbers in a two-column grid. */
export function StatTiles({ items }: { items: { label: string; value: number; note?: string }[] }) {
  return (
    <View style={styles.tiles}>
      {items.map((item) => (
        <View key={item.label} style={styles.tile}>
          <Text variant="small">{item.label}</Text>
          <Text style={styles.value}>{number.format(item.value)}</Text>
          {item.note ? <Text variant="small">{item.note}</Text> : null}
        </View>
      ))}
    </View>
  )
}

/** Views, and downloads for things that have them. */
export function Counts({ item }: { item: Pick<ModerationItem, 'viewCount' | 'downloadCount'> }) {
  return (
    <View style={styles.counts}>
      <Ionicons name="eye-outline" size={14} color={colors.ink500} />
      <Text variant="small">{number.format(item.viewCount)}</Text>
      {item.downloadCount !== null && (
        <>
          <Ionicons name="download-outline" size={14} color={colors.ink500} style={styles.gap} />
          <Text variant="small">{number.format(item.downloadCount)}</Text>
        </>
      )}
    </View>
  )
}

/** The maker's most viewed items of one kind. Each opens its own stats screen. */
export function TopList({ items, kind, empty }: { items: ModerationItem[]; kind: 'photos' | 'books' | 'spaces'; empty: string }) {
  if (!items.length) return <Text variant="muted">{empty}</Text>

  return (
    <View>
      {items.map((item, i) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/stats/[kind]/[id]', params: { kind, id: item.id } })}
          style={({ pressed }) => [styles.row, i > 0 && styles.divided, pressed && styles.pressed]}
        >
          <View style={styles.thumb}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : null}</View>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <Counts item={item} />
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexGrow: 1, flexBasis: '40%', gap: 2, padding: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.surface200, backgroundColor: colors.white },
  value: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink900 },
  counts: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gap: { marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divided: { borderTopWidth: 1, borderTopColor: colors.surface200 },
  pressed: { opacity: 0.7 },
  thumb: { width: 44, height: 44, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface100 },
  image: { width: '100%', height: '100%' },
  title: { flex: 1, fontFamily: fonts.semibold, color: colors.ink900 },
})
