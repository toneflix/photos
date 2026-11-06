import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import { colors } from '@/theme'

const number = new Intl.NumberFormat('en')
const plural = (count: number, one: string) => `${number.format(count)} ${count === 1 ? one : `${one}s`}`

/** "120 views · 8 downloads" on public work. Renders nothing when the owner keeps counts private. */
export function ContentCounts({ stats, light = false, style }: { stats: { views: number; downloads: number | null } | null | undefined; light?: boolean; style?: StyleProp<ViewStyle> }) {
  if (!stats) return null

  const tone = light ? 'rgba(255,255,255,0.8)' : colors.ink500

  return (
    <View style={[styles.row, style]}>
      <View style={styles.count}>
        <Ionicons name="eye-outline" size={16} color={tone} />
        <Text style={[styles.text, { color: tone }]}>{plural(stats.views, 'view')}</Text>
      </View>
      {stats.downloads !== null && (
        <View style={styles.count}>
          <Ionicons name="download-outline" size={16} color={tone} />
          <Text style={[styles.text, { color: tone }]}>{plural(stats.downloads, 'download')}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 4 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 14 },
})
