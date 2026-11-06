import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import { creditLine, licenseFor, type PublicPhotoDetail } from '@photos/types'
import { COVERS } from '@/components/BookCover'
import { Owner } from '@/components/explore/Owner'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { DownloadSheet } from '@/components/DownloadSheet'
import { FormProblem } from '@/lib/forms'
import { colors, fonts, radius } from '@/theme'

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/** A public photo: who shared it, its licence and credit line, the books it's in, and a download when the licence allows. */
export default function ExplorePhoto() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { data, error, loading } = useRequest(() => api.explore.photo(id))
  const photo: PublicPhotoDetail | undefined = data?.data

  if (!photo) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {loading ? <ActivityIndicator color={colors.ink500} /> : <Callout>{FormProblem.from(error).message ?? "This photo isn't public anymore."}</Callout>}
      </View>
    )
  }

  const ratio = photo.width && photo.height ? photo.width / photo.height : 4 / 3

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View style={[styles.stage, { paddingTop: insets.top }]}>
        <Image
          source={{ uri: photo.url }}
          style={{ width, height: Math.min(width / ratio, width * 1.3) }}
          contentFit="contain"
          accessibilityLabel={photo.caption ?? 'Photo'}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.back, { top: insets.top + 12 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.byline}>
          <Owner owner={photo.owner} />
          {photo.space && (
            <Link href={{ pathname: '/spaces/[slug]', params: { slug: photo.space.slug } }}>
              <Text variant="muted">
                in <Text variant="link">{photo.space.name}</Text>
              </Text>
            </Link>
          )}
        </View>

        {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
        <Text variant="muted">
          {photo.takenAt ? `Taken ${formatDate(photo.takenAt)} · ` : ''}Shared {formatDate(photo.publishedAt ?? photo.createdAt)}
        </Text>

        <LicensePanel photo={photo} />

        {photo.books.length > 0 && (
          <View style={styles.books}>
            <Text style={styles.kicker}>IN {photo.books.length === 1 ? 'A BOOK' : 'BOOKS'}</Text>
            {photo.books.map((book) => (
              <View key={book.id} style={styles.book}>
                <View style={[styles.spine, { backgroundColor: (COVERS[book.theme] ?? COVERS.classic).cloth }]} />
                <View style={styles.flex}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <Text variant="muted">On page {book.page}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

/** What visitors may do with the photo, the credit line to copy, and the download when the licence allows it. */
function LicensePanel({ photo }: { photo: PublicPhotoDetail }) {
  const license = licenseFor(photo.license)
  const credit = creditLine(photo, license)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const copy = async () => {
    await Clipboard.setStringAsync(credit)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>LICENCE</Text>
      <View style={styles.licenseRow}>
        <Ionicons name={license.downloadable ? 'lock-open-outline' : 'lock-closed-outline'} size={16} color={license.downloadable ? colors.brand700 : colors.ink500} />
        <Text style={styles.licenseName}>{license.label}</Text>
      </View>
      <Text variant="muted">{license.summary}</Text>
      {license.credit && (
        <View style={styles.credit}>
          <Text variant="label">Credit it like this</Text>
          <Text selectable>{credit}</Text>
          <Text variant="link" accessibilityRole="button" onPress={copy}>
            {copied ? 'Copied' : 'Copy credit'}
          </Text>
        </View>
      )}
      <Link href="/licenses">
        <Text variant="link">About licences</Text>
      </Link>
      {license.downloadable && <Button title="Download" onPress={() => setDownloading(true)} />}
      {downloading && <DownloadSheet photo={photo} owned={false} onClose={() => setDownloading(false)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  flex: { flex: 1 },
  stage: { backgroundColor: colors.ink900, alignItems: 'center' },
  back: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, gap: 14 },
  byline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  caption: { fontSize: 18, lineHeight: 26 },
  panel: { gap: 8, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface200 },
  kicker: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.5, color: colors.ink500 },
  licenseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  licenseName: { fontFamily: fonts.display, fontSize: 16 },
  credit: { gap: 4, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface100 },
  books: { gap: 8 },
  book: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface200 },
  spine: { width: 36, height: 48, borderRadius: 2 },
  bookTitle: { fontFamily: fonts.display, fontSize: 15 },
})
