import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { Photo } from '@photos/types'
import { colors } from '@/theme'

/** Up to four photos tiled as a space's cover, or a soft brand wash when it has none yet. */
export function SpaceCover({ photos, style }: { photos: Photo[]; style?: StyleProp<ViewStyle> }) {
  const tiles = photos.slice(0, 4)

  if (!tiles.length) {
    return (
      <LinearGradient colors={[colors.brand50, colors.surface100, colors.gold50]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.empty, style]}>
        <Ionicons name="images-outline" size={40} color="rgba(0,100,214,0.4)" />
      </LinearGradient>
    )
  }

  const image = (photo: Photo) => <Image key={photo.id} source={{ uri: photo.thumbnailUrl ?? photo.url }} style={styles.fill} contentFit="cover" />

  if (tiles.length < 3) return <View style={[styles.row, style]}>{tiles.map((photo) => <View key={photo.id} style={styles.cell}>{image(photo)}</View>)}</View>

  const [first, ...rest] = tiles

  return (
    <View style={[styles.row, style]}>
      <View style={styles.cell}>{image(first)}</View>
      <View style={styles.cell}>
        {tiles.length === 3 ? (
          rest.map((photo) => (
            <View key={photo.id} style={styles.cell}>
              {image(photo)}
            </View>
          ))
        ) : (
          <>
            <View style={[styles.cell, styles.row]}>
              {rest.slice(0, 2).map((photo) => (
                <View key={photo.id} style={styles.cell}>
                  {image(photo)}
                </View>
              ))}
            </View>
            <View style={styles.cell}>{image(rest[2])}</View>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 2, backgroundColor: colors.surface200 },
  cell: { flex: 1, gap: 2, overflow: 'hidden' },
  fill: { flex: 1 },
})
