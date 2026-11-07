import { useCallback } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { usePagination, useRequest } from 'alova/client'
import { spacePermissionLabels, type SharedSpace, type Space } from '@photos/types'
import { Ionicons } from '@expo/vector-icons'
import { SpaceCard } from '@/components/spaces/SpaceCard'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { FormProblem } from '@/lib/forms'
import { spaceLists } from '@/lib/lists'
import { colors, fonts, radius } from '@/theme'

/** Your spaces and the spaces shared with you. */
export default function Spaces() {
  const list = usePagination((page, pageSize) => api.spaces.list({ page, per_page: pageSize }), {
    append: true,
    initialPageSize: 24,
    preloadPreviousPage: false,
    preloadNextPage: false,
    total: (response) => response.meta.total,
    data: (response) => response.data,
    middleware: spaceLists.middleware,
  })
  const spaces = list.data as Space[]
  const invites = useRequest(() => api.spaces.invites({ per_page: 1 }), { cacheFor: null })
  const shared = useRequest(() => api.spaces.shared({ per_page: 100 }), { cacheFor: null })
  const waiting: number = invites.data?.meta.total ?? 0
  const sharedSpaces: SharedSpace[] = shared.data?.data ?? []

  useFocusEffect(
    useCallback(() => {
      invites.send().catch(() => undefined)
      shared.send().catch(() => undefined)
    }, []),
  )

  const leave = async (space: SharedSpace) => {
    if (!(await confirm(`Leave “${space.name}”?`, 'Your photos and books leave the space and stay in your library.', 'Leave'))) return

    await api.spaces.removeMember(space.id, space.membershipId).send().catch(() => undefined)
    shared.update({ data: { ...shared.data, data: sharedSpaces.filter((entry) => entry.id !== space.id) } })
  }

  return (
    <FlatList
      data={spaces}
      keyExtractor={(space) => space.id}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="display">Your spaces</Text>
          <Text variant="muted">A home for each brand, studio or project.</Text>
          <Button title="New space" onPress={() => router.push('/space-form')} />
          {list.error ? <Callout>{FormProblem.from(list.error).message}</Callout> : null}
          {waiting > 0 && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/invites')} style={({ pressed }) => [styles.invites, pressed && styles.chipPressed]}>
              <Text style={styles.invitesText}>{waiting === 1 ? 'You have an invite to join a space.' : `You have ${waiting} invites to join spaces.`}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.brand700} />
            </Pressable>
          )}
        </View>
      }
      renderItem={({ item: space }) => (
        <SpaceCard space={space}>
          <View style={styles.chips}>
            <Chip label="Photos" onPress={() => router.navigate({ pathname: '/photos', params: { space: space.id } })} />
            <Chip label="Books" onPress={() => router.navigate({ pathname: '/', params: { space: space.id } })} />
            <Chip label="Edit" onPress={() => router.push({ pathname: '/space-form', params: { id: space.id } })} />
            <Chip label="Stats" onPress={() => router.push({ pathname: '/stats/[kind]/[id]', params: { kind: 'spaces', id: space.id } })} />
            <Chip label="Members" onPress={() => router.push({ pathname: '/space-members', params: { slug: space.slug } })} />
          </View>
        </SpaceCard>
      )}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (!list.isLastPage && !list.loading && spaces.length) list.update({ page: list.page + 1 })
      }}
      refreshing={false}
      onRefresh={() => list.reload()}
      ListFooterComponent={
        <>
          {list.loading ? <ActivityIndicator style={styles.spinner} color={colors.ink500} /> : null}
          {sharedSpaces.length > 0 && (
            <View style={styles.shared}>
              <Text variant="title">Shared with you</Text>
              <Text variant="muted">Spaces other people invited you into.</Text>
              {sharedSpaces.map((space) => (
                <SharedSpaceCard key={space.id} space={space} onLeave={() => leave(space)} />
              ))}
            </View>
          )}
        </>
      }
    />
  )
}

/** A space someone shared with the user, with what they can do there and a way to leave. */
function SharedSpaceCard({ space, onLeave }: { space: SharedSpace; onLeave: () => void }) {
  return (
    <SpaceCard space={space}>
      <Text variant="muted">
        From {space.owner.name ?? 'a Toneflix member'} · You can: {spacePermissionLabels(space.permissions)}
      </Text>
      <View style={styles.chips}>
        {space.permissions.includes('create') && (
          <>
            <Chip label="Your photos" onPress={() => router.navigate({ pathname: '/photos', params: { space: space.id } })} />
            <Chip label="Your books" onPress={() => router.navigate({ pathname: '/', params: { space: space.id } })} />
          </>
        )}
        {space.permissions.includes('manage') && <Chip label="Members" onPress={() => router.push({ pathname: '/space-members', params: { slug: space.slug } })} />}
        <Chip label="Leave" onPress={onLeave} />
      </View>
    </SpaceCard>
  )
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { gap: 10, paddingTop: 20, paddingBottom: 20 },
  gap: { height: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surface100 },
  chipPressed: { backgroundColor: colors.surface200 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink700 },
  spinner: { marginVertical: 24 },
  shared: { gap: 10, marginTop: 40 },
  invites: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.brand50,
  },
  invitesText: { flex: 1, fontFamily: fonts.semibold, color: colors.brand700 },
})
