import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PHOTO_ZOOM, PhotoCrop, type PhotoPosition } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'

/** How much one press of − or + zooms. */
const STEP = 0.25

/** Zoom and centre buttons for a photo that is moved by dragging and pinching it on the page. */
export function PhotoPositionControls({ position, onChange }: { position: PhotoPosition | null | undefined; onChange: (position: PhotoPosition | null) => void }) {
  const crop = PhotoCrop.of(position)
  const zoom = (by: number) => onChange(crop.zoomTo(crop.zoom + by).toJSON())

  return (
    <View style={styles.row}>
      <Text variant="muted" style={styles.hint}>
        Drag the photo to choose what shows. Pinch to zoom.
      </Text>
      <ZoomButton icon="remove" label="Zoom out" disabled={crop.zoom <= PHOTO_ZOOM.min} onPress={() => zoom(-STEP)} />
      <Text style={styles.zoom}>{crop.zoom.toFixed(1)}×</Text>
      <ZoomButton icon="add" label="Zoom in" disabled={crop.zoom >= PHOTO_ZOOM.max} onPress={() => zoom(STEP)} />
      <Text variant="link" accessibilityRole="button" accessibilityState={{ disabled: crop.isCentred }} onPress={crop.isCentred ? undefined : () => onChange(null)} style={[styles.centre, crop.isCentred && styles.faded]}>
        Centre
      </Text>
    </View>
  )
}

function ZoomButton({ icon, label, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6} style={[styles.button, disabled && styles.faded]}>
      <Ionicons name={icon} size={16} color={colors.ink700} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { flex: 1, fontSize: 13 },
  zoom: { minWidth: 34, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 13, color: colors.ink700 },
  button: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface100 },
  centre: { fontSize: 13 },
  faded: { opacity: 0.35 },
})
