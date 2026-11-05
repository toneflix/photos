import { useState } from 'react'
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { PublicSpace } from '@photos/types'
import { PublicBooks, PublicPhotos } from '@/components/explore/ExploreLists'
import { Owner } from '@/components/explore/Owner'
import { Segmented } from '@/components/Segmented'
import { PrivateBadge, spaceCounts } from '@/components/spaces/SpaceCard'
import { SpaceCover } from '@/components/spaces/SpaceCover'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { webUrl } from '@/lib/links'
import { colors, radius } from '@/theme'

type Tab = 'photos' | 'books'

/** A space's page: Explore kept to one space. Private spaces open only for their owner. */
export default function SpacePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('photos')
  const { data, error, loading } = useRequest(() => api.explore.space(slug))
  const space: PublicSpace | undefined = data?.data

  if (!space) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {loading ? <ActivityIndicator color={colors.ink500} /> : <Callout>{FormProblem.from(error).message ?? 'Space not found'}</Callout>}
      </View>
    )
  }

  const header = (
    <View style={styles.header}>
      {space.canEdit && space.visibility === 'private' && (
        <Callout tone="warning">Only you can see this page. It shows what visitors will see once you make the space public.</Callout>
      )}
      {space.previews.length > 0 && <SpaceCover photos={space.previews} style={styles.cover} />}
      <View style={styles.titleRow}>
        <Text variant="display" style={styles.flex}>
          {space.name}
        </Text>
        {space.visibility === 'private' && <PrivateBadge />}
      </View>
      {space.description ? <Text style={styles.description}>{space.description}</Text> : null}
      <View style={styles.meta}>
        <Owner owner={space.owner} />
        <Text variant="muted">{spaceCounts(space)}</Text>
      </View>
      <View style={styles.actions}>
        {space.visibility === 'public' && (
          <Button title="Share" variant="secondary" onPress={() => Share.share({ message: webUrl(`/spaces/${space.slug}`) }).catch(() => undefined)} />
        )}
        {space.canEdit && (
          <>
            <Button title="Add photos" onPress={() => router.navigate({ pathname: '/photos', params: { space: space.id } })} />
            <Button title="Edit space" variant="ghost" onPress={() => router.push({ pathname: '/space-form', params: { id: space.id } })} />
          </>
        )}
      </View>
      <View style={styles.tabs}>
        <Segmented
          options={[
            { value: 'photos', label: 'Photos' },
            { value: 'books', label: 'Books' },
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
      {tab === 'books' ? <PublicBooks header={header} space={space.slug} /> : <PublicPhotos header={header} space={space.slug} />}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  flex: { flex: 1 },
  back: { paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  header: { gap: 10, paddingTop: 4 },
  cover: { aspectRatio: 4 / 3, borderRadius: radius.xl, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  description: { fontSize: 17, lineHeight: 25, color: colors.ink700 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tabs: { marginTop: 14, marginBottom: 6 },
})
