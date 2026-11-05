import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

/** Tones for the stand-in photos, from warm daylight to dusk. */
const TILES = [
  ['#fde68a', '#fdba74', '#fb7185'],
  ['#7dd3fc', '#a5f3fc', '#5eead4'],
  ['#a7f3d0', '#d9f99d', '#fef08a'],
  ['#c4b5fd', '#f5d0fe', '#f9a8d4'],
  ['#fed7aa', '#fcd34d', '#eab308'],
  ['#94a3b8', '#0ea5e9', '#4f46e5'],
  ['#fecdd3', '#f9a8d4', '#fca5a5'],
  ['#5eead4', '#34d399', '#16a34a'],
  ['#fef9c3', '#fed7aa', '#fbbf24'],
  ['#a5b4fc', '#d8b4fe', '#fbcfe8'],
  ['#d6d3d1', '#fde68a', '#fdba74'],
  ['#a5f3fc', '#7dd3fc', '#60a5fa'],
] as const

const HEIGHTS = [160, 224, 192, 256, 176, 208]

/** A masonry wall of soft colour blocks that stands in for photos behind heroes. */
export function Mosaic({ columns = 4, style }: { columns?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.wall, style]} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      {Array.from({ length: columns }, (_, column) => (
        <View key={column} style={[styles.column, column % 2 === 1 && styles.offset]}>
          {Array.from({ length: 4 }, (_, row) => {
            const index = column * 4 + row

            return (
              <LinearGradient
                key={row}
                colors={TILES[(index * 7) % TILES.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.tile, { height: HEIGHTS[(index * 5) % HEIGHTS.length] }]}
              />
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wall: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 10 },
  offset: { marginTop: -64 },
  tile: { borderRadius: 8 },
})
