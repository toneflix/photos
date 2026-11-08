import type { ReactElement } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import type { PublicPhoto } from '@photos/types'
import { explorePhotos } from '@/lib/photo-sequence'
import { colors, radius } from '@/theme'
import { Owner } from './Owner'

const GAP = 10
const PADDING = 16

/** Splits photos into two columns, each going to the shorter one, like the web's masonry wall. */
function columns(photos: PublicPhoto[]) {
  const cols: [PublicPhoto[], PublicPhoto[]] = [[], []]
  const heights = [0, 0]

  for (const photo of photos) {
    const ratio = photo.width && photo.height ? photo.height / photo.width : 0.75
    const shorter = heights[0] <= heights[1] ? 0 : 1

    cols[shorter].push(photo)
    heights[shorter] += ratio
  }

  return cols
}

/** A two-column wall of public photos, with who took each one. Opening one shows its page, which swipes through the wall. */
export function PhotoWall({
  photos,
  header,
  loading,
  onEndReached,
  onRefresh,
}: {
  photos: PublicPhoto[]
  header?: ReactElement
  loading?: boolean
  onEndReached?: () => void
  onRefresh?: () => void
}) {
  const { width } = useWindowDimensions()
  const column = (width - PADDING * 2 - GAP) / 2

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      scrollEventThrottle={200}
      onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
        if (layoutMeasurement.height + contentOffset.y > contentSize.height - layoutMeasurement.height) onEndReached?.()
      }}
      refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
    >
      {header}
      <View style={styles.wall}>
        {columns(photos).map((list, index) => (
          <View key={index} style={[styles.column, { width: column }]}>
            {list.map((photo) => (
              <Pressable
                key={photo.id}
                accessibilityRole="imagebutton"
                accessibilityLabel={photo.caption ?? `Photo by ${photo.owner.name ?? 'a Toneflix member'}`}
                onPress={() => {
                  explorePhotos.follow(photos)
                  router.push({ pathname: '/explore/photos/[id]', params: { id: photo.id } })
                }}
                style={[styles.tile, { height: column * (photo.width && photo.height ? photo.height / photo.width : 0.75) }]}
              >
                <Image source={{ uri: photo.thumbnailUrl ?? photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} recyclingKey={photo.id} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.shade} />
                <View style={styles.owner}>
                  <Owner owner={photo.owner} light plain />
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      {loading && <ActivityIndicator style={styles.spinner} color={colors.ink500} />}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PADDING, paddingBottom: 32 },
  wall: { flexDirection: 'row', gap: GAP },
  column: { gap: GAP },
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface200 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
  owner: { position: 'absolute', left: 8, right: 8, bottom: 8 },
  spinner: { marginVertical: 24 },
})
