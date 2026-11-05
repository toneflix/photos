import { useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import type { Book, BookTheme, Photo } from '@photos/types'
import { Text } from '@/components/ui'
import { fonts } from '@/theme'

/** Cover cloth and foil for each theme, matching the web's .cover-* styles. */
export const COVERS: Record<BookTheme, { cloth: string; foil: string; label: string }> = {
  classic: { cloth: '#5a1d22', foil: '#e2c58f', label: 'Classic leather' },
  linen: { cloth: '#e6dcc6', foil: '#3d3226', label: 'Linen' },
  midnight: { cloth: '#141b2e', foil: '#d5dbe8', label: 'Midnight' },
}

/** A book's front cover, laid out in proportion to its width like the web's CoverView. */
export function BookCover({ book }: { book: Pick<Book, 'title' | 'description' | 'theme'> & { coverPhoto?: Photo | null } }) {
  const [width, setWidth] = useState(0)
  const cover = COVERS[book.theme] ?? COVERS.classic
  const cqw = width / 100

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: cover.cloth }]} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.spine, { width: 4 * cqw }]}
      />
      {width > 0 && (
        <View style={[styles.frame, { margin: 6 * cqw, paddingVertical: 8 * cqw, paddingHorizontal: 6 * cqw, borderColor: cover.foil }]}>
          <Text style={[styles.kicker, { color: cover.foil, fontSize: 2.6 * cqw, letterSpacing: 0.8 * cqw }]}>A TONEFLIX PHOTO BOOK</Text>
          <Text numberOfLines={3} style={[styles.title, { color: cover.foil, fontSize: 9 * cqw, lineHeight: 9.6 * cqw, marginTop: 5 * cqw }]}>
            {book.title}
          </Text>
          {book.coverPhoto ? (
            <View style={[styles.photo, { marginTop: 7 * cqw, borderWidth: 0.8 * cqw, borderColor: cover.foil }]}>
              <Image source={{ uri: book.coverPhoto.thumbnailUrl ?? book.coverPhoto.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          ) : book.description ? (
            <Text numberOfLines={4} style={[styles.description, { color: cover.foil, fontSize: 4 * cqw, lineHeight: 5.6 * cqw, marginTop: 6 * cqw }]}>
              {book.description}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  spine: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  frame: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth * 2, opacity: 0.95 },
  kicker: { fontFamily: fonts.medium, opacity: 0.7, textAlign: 'center' },
  title: { fontFamily: fonts.serif, textAlign: 'center' },
  photo: { width: '100%', flex: 1, maxHeight: '62%', overflow: 'hidden' },
  description: { fontFamily: fonts.serifItalic, textAlign: 'center', opacity: 0.8 },
})
