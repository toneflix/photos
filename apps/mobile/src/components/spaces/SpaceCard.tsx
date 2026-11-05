import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Space } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'
import { SpaceCover } from './SpaceCover'

/** "12 photos · 2 books" */
export function spaceCounts(space: Pick<Space, 'photoCount' | 'bookCount'>) {
  const photos = `${space.photoCount} ${space.photoCount === 1 ? 'photo' : 'photos'}`
  const books = `${space.bookCount} ${space.bookCount === 1 ? 'book' : 'books'}`

  return `${photos} · ${books}`
}

/** Marks a space only its owner can open. */
export function PrivateBadge() {
  return (
    <View style={styles.badge}>
      <Ionicons name="lock-closed" size={11} color={colors.white} />
      <Text style={styles.badgeText}>Private</Text>
    </View>
  )
}

/** A space in a list: its photo cover, name and what's inside. `children` adds owner details or actions below. */
export function SpaceCard({ space, children }: { space: Space; children?: ReactNode }) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${space.name}`}
        onPress={() => router.push({ pathname: '/spaces/[slug]', params: { slug: space.slug } })}
        style={styles.cover}
      >
        <SpaceCover photos={space.previews} style={StyleSheet.absoluteFill} />
        {space.visibility === 'private' && (
          <View style={styles.corner}>
            <PrivateBadge />
          </View>
        )}
      </Pressable>
      <Text style={styles.name} numberOfLines={1}>
        {space.name}
      </Text>
      <Text variant="muted">{spaceCounts(space)}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 2 },
  cover: { aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 10 },
  corner: { position: 'absolute', top: 8, left: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)', alignSelf: 'flex-start' },
  badgeText: { color: colors.white, fontSize: 11, fontFamily: fonts.medium },
  name: { fontFamily: fonts.display, fontSize: 17 },
})
