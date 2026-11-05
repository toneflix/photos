import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { FRAME_STYLES, type FrameStyle, type Photo } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'
import { usePaper } from './paper'
import { PrintedPhoto } from './PrintedPhoto'

const SWATCH = 64
const FRAMES = Object.keys(FRAME_STYLES) as FrameStyle[]

/** Frame swatches for one page, each a tiny printed page. Null means the page follows the book's frame. */
export function FramePicker({
  frame,
  bookFrame,
  sample,
  onPick,
  onUseEverywhere,
}: {
  frame: FrameStyle | null
  bookFrame: FrameStyle
  sample: Photo | null
  onPick: (frame: FrameStyle | null) => void
  onUseEverywhere: (frame: FrameStyle) => void
}) {
  const shown = frame ?? bookFrame

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.kicker}>FRAME</Text>
        {frame !== null && frame !== bookFrame && (
          <Text variant="link" accessibilityRole="button" onPress={() => onUseEverywhere(frame)} style={styles.small}>
            Use {FRAME_STYLES[frame].label} on every page
          </Text>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Photo frame">
        <Swatch frame={bookFrame} label="Book's frame" checked={frame === null} sample={sample} onPress={() => onPick(null)} />
        {FRAMES.map((value) => (
          <Swatch key={value} frame={value} label={FRAME_STYLES[value].label} checked={frame === value} sample={sample} onPress={() => onPick(value)} />
        ))}
      </ScrollView>
      <Text variant="muted" style={styles.small}>
        {FRAME_STYLES[shown].description}.
      </Text>
    </View>
  )
}

function Swatch({ frame, label, checked, sample, onPress }: { frame: FrameStyle; label: string; checked: boolean; sample: Photo | null; onPress: () => void }) {
  const look = usePaper()

  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked }} accessibilityLabel={label} style={styles.swatch}>
      <View style={[styles.tile, { backgroundColor: look.background }, checked && styles.checked]}>
        <View style={styles.inset}>
          <PrintedPhoto photo={sample} frame={frame} unit={SWATCH * 0.03} />
        </View>
      </View>
      <Text numberOfLines={2} style={[styles.label, checked && styles.labelChecked]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  panel: { gap: 8, padding: 12, borderRadius: radius.lg, backgroundColor: colors.white },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  kicker: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, color: colors.ink500 },
  small: { fontSize: 12 },
  row: { gap: 10 },
  swatch: { width: SWATCH, alignItems: 'center', gap: 4 },
  tile: { width: SWATCH, height: SWATCH, borderRadius: 6, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(0,0,0,0.05)' },
  checked: { borderColor: colors.brand500 },
  inset: { position: 'absolute', top: '12%', right: '12%', bottom: '12%', left: '12%' },
  label: { fontSize: 11, lineHeight: 13, textAlign: 'center', color: colors.ink500 },
  labelChecked: { fontFamily: fonts.medium, color: colors.ink900 },
})
