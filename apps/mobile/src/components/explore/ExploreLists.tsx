import type { ReactElement } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, View, useWindowDimensions } from 'react-native'
import { usePagination } from 'alova/client'
import type { PublicBook, PublicPhoto, PublicSpace } from '@photos/types'
import { BookCover } from '@/components/BookCover'
import { useTabBarInset } from '@/components/GlassTabBar'
import { SearchFilters } from '@/components/SearchFilters'
import { SpaceCard } from '@/components/spaces/SpaceCard'
import { Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { ORIENTATION_FILTER, SORT_FILTER, THEME_FILTER, useFilters } from '@/lib/filters'
import { FormProblem } from '@/lib/forms'
import { colors, fonts, radius } from '@/theme'
import { Owner } from './Owner'
import { PhotoWall } from './PhotoWall'

const listOptions = {
  append: true,
  preloadPreviousPage: false,
  preloadNextPage: false,
  total: (response: { meta: { total: number } }) => response.meta.total,
  data: (response: { data: unknown[] }) => response.data,
} as const

/** The search box, a "found" count and the empty or error message above a public list. */
function ListTop({
  header,
  placeholder,
  filters,
  state,
  noun,
  empty,
}: {
  header?: ReactElement
  placeholder: string
  filters: Parameters<typeof SearchFilters>[0]['filters']
  state: { filters: ReturnType<typeof useFilters>; total: number; count: number; loading: boolean; error: unknown }
  noun: [string, string]
  empty: string
}) {
  const { filters: values, total, count, loading, error } = state

  return (
    <View style={styles.top}>
      {header}
      <SearchFilters placeholder={placeholder} filters={filters} values={values.values} onChange={values.set} />
      {values.active && <Text variant="muted">{`${total} ${total === 1 ? noun[0] : noun[1]} found`}</Text>}
      {error ? <Callout>{FormProblem.from(error).message}</Callout> : null}
      {!count && !loading && !error && <Text variant="muted">{values.active ? `No ${noun[1]} match. Try other words or clear the filters.` : empty}</Text>}
    </View>
  )
}

/** Public photos on Explore, in one space when `space` (its web address) is given, or by one `maker`. */
export function PublicPhotos({ header, space, maker }: { header?: ReactElement; space?: string; maker?: string }) {
  const filters = useFilters()
  const list = usePagination((page, pageSize) => api.explore.photos({ ...filters.query, space, maker, page, per_page: pageSize }), {
    ...listOptions,
    initialPageSize: 40,
    watchingStates: [filters.key, space, maker],
  })
  const photos = list.data as PublicPhoto[]

  return (
    <PhotoWall
      photos={photos}
      loading={list.loading}
      onRefresh={() => list.reload()}
      onEndReached={() => !list.isLastPage && !list.loading && photos.length && list.update({ page: list.page + 1 })}
      header={
        <ListTop
          header={header}
          placeholder="Search photos by caption or photographer"
          filters={[ORIENTATION_FILTER, SORT_FILTER]}
          state={{ filters, total: list.total ?? 0, count: photos.length, loading: list.loading, error: list.error }}
          noun={['photo', 'photos']}
          empty={space ? 'No public photos in this space yet.' : maker ? 'No public photos yet.' : 'No one has shared a photo yet. Open a photo in your library and turn on Show on Explore.'}
        />
      }
    />
  )
}

/** Public books on Explore, in one space, or by one maker. */
export function PublicBooks({ header, space, maker }: { header?: ReactElement; space?: string; maker?: string }) {
  const { width } = useWindowDimensions()
  const filters = useFilters()
  const list = usePagination((page, pageSize) => api.explore.books({ ...filters.query, space, maker, page, per_page: pageSize }), {
    ...listOptions,
    initialPageSize: 24,
    watchingStates: [filters.key, space, maker],
  })
  const books = list.data as PublicBook[]
  const inset = useTabBarInset()
  const cover = (width - 32 - 16) / 2

  return (
    <FlatList
      data={books}
      keyExtractor={(book) => book.id}
      numColumns={2}
      columnWrapperStyle={styles.bookRow}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + inset }]}
      ListHeaderComponent={
        <ListTop
          header={header}
          placeholder="Search books by title, story or author"
          filters={[THEME_FILTER, SORT_FILTER]}
          state={{ filters, total: list.total ?? 0, count: books.length, loading: list.loading, error: list.error }}
          noun={['book', 'books']}
          empty={space ? 'No public books in this space yet.' : maker ? 'No public books yet.' : 'No public books yet. Set a book to Public in its editor and it shows up here.'}
        />
      }
      renderItem={({ item: book }) => (
        <View style={{ width: cover }}>
          <View style={[styles.cover, { height: (cover * 4) / 3 }]} accessibilityLabel={book.title}>
            <BookCover book={book} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {book.title}
          </Text>
          <View style={styles.meta}>
            <Owner owner={book.owner} />
            <Text variant="small">
              {book.pageCount} {book.pageCount === 1 ? 'page' : 'pages'}
            </Text>
          </View>
        </View>
      )}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (!list.isLastPage && !list.loading && books.length) list.update({ page: list.page + 1 })
      }}
      refreshing={false}
      onRefresh={() => list.reload()}
      ListFooterComponent={list.loading ? <ActivityIndicator style={styles.spinner} color={colors.ink500} /> : undefined}
    />
  )
}

/** Public spaces on Explore, or by one maker. */
export function PublicSpaces({ header, maker }: { header?: ReactElement; maker?: string }) {
  const filters = useFilters()
  const list = usePagination((page, pageSize) => api.explore.spaces({ ...filters.query, maker, page, per_page: pageSize }), {
    ...listOptions,
    initialPageSize: 24,
    watchingStates: [filters.key, maker],
  })
  const spaces = list.data as PublicSpace[]
  const inset = useTabBarInset()

  return (
    <FlatList
      data={spaces}
      keyExtractor={(space) => space.id}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + inset }]}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListHeaderComponent={
        <ListTop
          header={header}
          placeholder="Search spaces by name or creator"
          filters={[SORT_FILTER]}
          state={{ filters, total: list.total ?? 0, count: spaces.length, loading: list.loading, error: list.error }}
          noun={['space', 'spaces']}
          empty={maker ? 'No public spaces yet.' : 'No public spaces yet. Make one of your spaces public and it shows up here.'}
        />
      }
      renderItem={({ item: space }) => (
        <SpaceCard space={space}>
          {!maker && (
            <View style={styles.owner}>
              <Owner owner={space.owner} />
            </View>
          )}
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

const styles = StyleSheet.create({
  top: { gap: 12, paddingBottom: 16 },
  content: { paddingHorizontal: 16 },
  bookRow: { gap: 16, marginBottom: 24 },
  cover: { borderRadius: radius.md, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  title: { marginTop: 10, fontFamily: fonts.display, fontSize: 15 },
  meta: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  owner: { marginTop: 6 },
  gap: { height: 28 },
  spinner: { marginVertical: 24 },
})
