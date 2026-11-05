import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { usePagination } from 'alova/client'
import type { Space } from '@photos/types'
import { SpaceCard } from '@/components/spaces/SpaceCard'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { spaceLists } from '@/lib/lists'
import { colors, fonts, radius } from '@/theme'

/** Your spaces: keep work for different clients, events or brands apart. */
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

  return (
    <FlatList
      data={spaces}
      keyExtractor={(space) => space.id}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="display">Your spaces</Text>
          <Text variant="muted">Keep work for different clients, events or brands apart. Each space has its own page, private until you make it public.</Text>
          <Button title="New space" onPress={() => router.push('/space-form')} />
          {list.error ? <Callout>{FormProblem.from(list.error).message}</Callout> : null}
        </View>
      }
      renderItem={({ item: space }) => (
        <SpaceCard space={space}>
          <View style={styles.chips}>
            <Chip label="Photos" onPress={() => router.navigate({ pathname: '/photos', params: { space: space.id } })} />
            <Chip label="Books" onPress={() => router.navigate({ pathname: '/', params: { space: space.id } })} />
            <Chip label="Edit" onPress={() => router.push({ pathname: '/space-form', params: { id: space.id } })} />
          </View>
        </SpaceCard>
      )}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (!list.isLastPage && !list.loading && spaces.length) list.update({ page: list.page + 1 })
      }}
      refreshing={false}
      onRefresh={() => list.reload()}
      ListFooterComponent={list.loading ? <ActivityIndicator style={styles.spinner} color={colors.ink500} /> : undefined}
    />
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
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surface100 },
  chipPressed: { backgroundColor: colors.surface200 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink700 },
  spinner: { marginVertical: 24 },
})
