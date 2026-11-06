import { useState } from 'react'
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { Profile } from '@photos/types'
import { Avatar } from '@/components/Avatar'
import { ContentCounts } from '@/components/ContentCounts'
import { PublicBooks, PublicPhotos, PublicSpaces } from '@/components/explore/ExploreLists'
import { Segmented } from '@/components/Segmented'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { webUrl } from '@/lib/links'
import { colors } from '@/theme'

type Tab = 'photos' | 'books' | 'spaces'

const number = new Intl.NumberFormat('en')
const joined = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })
const plural = (count: number, one: string) => `${number.format(count)} ${count === 1 ? one : `${one}s`}`

/** A maker's profile: Explore kept to one maker's public photos, books and spaces. */
export default function MakerPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('photos')
  const { data, error, loading } = useRequest(() => api.explore.maker(id))
  const maker: Profile | undefined = data?.data

  if (!maker) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {loading ? <ActivityIndicator color={colors.ink500} /> : <Callout>{FormProblem.from(error).message ?? 'Maker not found'}</Callout>}
      </View>
    )
  }

  const header = (
    <View style={styles.header}>
      {!maker.isListed && <Callout tone="warning">Only you can see this page, because you keep your name off the work you share.</Callout>}
      <Avatar user={maker} size={80} />
      <Text variant="display">{maker.name}</Text>
      <Text variant="muted">
        {`${plural(maker.photoCount, 'photo')} · ${plural(maker.bookCount, 'book')} · ${plural(maker.spaceCount, 'space')} · Joined ${joined.format(new Date(maker.joinedAt))}`}
      </Text>
      <ContentCounts stats={maker.stats} style={styles.stats} />
      <View style={styles.actions}>
        {maker.isListed && (
          <Button title="Share" variant="secondary" onPress={() => Share.share({ message: webUrl(`/makers/${maker.id}`) }).catch(() => undefined)} />
        )}
        {maker.isOwner && (
          <Button
            title={maker.isListed ? 'Edit profile' : 'Show your name'}
            variant="ghost"
            onPress={() => router.push(maker.isListed ? '/settings/profile' : '/settings/sharing')}
          />
        )}
      </View>
      <View style={styles.tabs}>
        <Segmented
          options={[
            { value: 'photos', label: 'Photos' },
            { value: 'books', label: 'Books' },
            { value: 'spaces', label: 'Spaces' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
    </View>
  )

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.ink900} />
      </Pressable>
      {tab === 'books' && <PublicBooks header={header} maker={maker.id} />}
      {tab === 'spaces' && <PublicSpaces header={header} maker={maker.id} />}
      {tab === 'photos' && <PublicPhotos header={header} maker={maker.id} />}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  back: { paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  header: { gap: 10, paddingTop: 4 },
  stats: { justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tabs: { marginTop: 14, marginBottom: 6 },
})
