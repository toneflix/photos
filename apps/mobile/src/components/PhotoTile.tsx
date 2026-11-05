import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import type { Photo } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

/** A square photo in the library grid, with its Explore badge or its place in a selection. */
export function PhotoTile({ photo, size, order, selecting, onPress }: { photo: Photo; size: number; order: number; selecting: boolean; onPress: () => void }) {
  const picked = order >= 0

  return (
    <Pressable
      accessibilityRole={selecting ? 'checkbox' : 'imagebutton'}
      accessibilityState={selecting ? { checked: picked } : undefined}
      accessibilityLabel={photo.caption ?? 'Photo'}
      onPress={onPress}
      style={[styles.tile, { width: size, height: size }, picked && styles.picked]}
    >
      <Image source={{ uri: photo.thumbnailUrl ?? photo.url }} style={[styles.image, picked && styles.shrunk]} contentFit="cover" transition={250} recyclingKey={photo.id} />
      {photo.visibility === 'public' && !selecting && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>On Explore</Text>
        </View>
      )}
      {selecting && (
        <View style={[styles.check, picked && styles.checkOn]}>
          <Text style={styles.checkText}>{picked ? order + 1 : ''}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface200 },
  picked: { borderWidth: 3, borderColor: colors.brand500 },
  image: { width: '100%', height: '100%' },
  shrunk: { transform: [{ scale: 0.97 }] },
  badge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.55)' },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.medium },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.brand700, borderColor: colors.brand700 },
  checkText: { color: colors.white, fontSize: 12, fontFamily: fonts.semibold },
})
