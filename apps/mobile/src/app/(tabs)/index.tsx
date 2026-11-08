import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { usePagination } from 'alova/client'
import type { Book } from '@photos/types'
import { BookCover } from '@/components/BookCover'
import { useTabBarInset } from '@/components/GlassTabBar'
import { SearchFilters } from '@/components/SearchFilters'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { BOOK_VISIBILITY_FILTER, SORT_FILTER, THEME_FILTER, spaceFilter, useFilters } from '@/lib/filters'
import { FormProblem } from '@/lib/forms'
import { bookLists } from '@/lib/lists'
import { useSpaces } from '@/lib/spaces'
import { colors, fonts, radius } from '@/theme'

const COLUMNS = 2
const GAP = 16
const PADDING = 16

/** Your shelf of photo books, with search and filters, and a way to start a new one. */
export default function Books() {
  const { width } = useWindowDimensions()
  const params = useLocalSearchParams<{ space?: string }>()
  const filters = useFilters(params.space ? { space: params.space } : undefined)
  const spaces = useSpaces()
  const inset = useTabBarInset()
  const cover = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS

  const list = usePagination((page, pageSize) => api.books.list({ ...filters.query, page, per_page: pageSize }), {
    append: true,
    initialPageSize: 24,
    preloadPreviousPage: false,
    preloadNextPage: false,
    total: (response) => response.meta.total,
    data: (response) => response.data,
    watchingStates: [filters.key],
    middleware: bookLists.middleware,
  })
  const books = list.data as Book[]
  const total = list.total ?? 0
  const space = spaces.find((item) => item.id === filters.query.space)

  const header = (
    <View style={styles.header}>
      <Text variant="display">Your books</Text>
      <Text variant="muted">
        {filters.active
          ? `${total} ${total === 1 ? 'book matches' : 'books match'}.`
          : total === 0 && !list.loading
            ? 'Bind your photos into your first book.'
            : `${total} ${total === 1 ? 'book' : 'books'} on your shelf.`}
      </Text>
      <View style={styles.headerActions}>
        <Button title="New book" style={styles.flex} onPress={() => router.push({ pathname: '/books/new', params: space ? { space: space.id } : {} })} />
        <Button title="Open with a code" variant="secondary" style={styles.flex} onPress={() => router.push('/unlock')} />
      </View>
      {(total > 0 || filters.active || spaces.length > 0) && (
        <SearchFilters
          placeholder="Search your books by title or description"
          filters={[...(spaces.length ? [spaceFilter(spaces)] : []), THEME_FILTER, BOOK_VISIBILITY_FILTER, SORT_FILTER]}
          values={filters.values}
          onChange={filters.set}
        />
      )}
      {list.error ? <Callout>{FormProblem.from(list.error).message}</Callout> : null}
      {filters.active && total === 0 && !list.loading && <Text variant="muted">No books match. Try other words or clear the filters.</Text>}
    </View>
  )

  return (
    <FlatList
      data={books}
      keyExtractor={(book) => book.id}
      numColumns={COLUMNS}
      ListHeaderComponent={header}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + inset }]}
      renderItem={({ item: book }) => (
        <Pressable
          style={{ width: cover }}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/books/[id]', params: { id: book.id } })}
        >
          <View style={[styles.cover, { height: (cover * 4) / 3 }]} accessibilityLabel={book.title}>
            <BookCover book={book} />
            {book.visibility !== 'private' && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{book.visibility === 'public' ? 'Public' : 'Shared'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {book.title}
          </Text>
          <Text variant="muted">
            {book.pageCount} {book.pageCount === 1 ? 'page' : 'pages'} ·{' '}
            {new Date(book.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </Pressable>
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: PADDING },
  header: { gap: 12, paddingTop: 20, paddingBottom: 20 },
  flex: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 10 },
  row: { gap: GAP, marginBottom: 24 },
  cover: { borderRadius: radius.md, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.55)' },
  badgeText: { color: colors.white, fontSize: 11, fontFamily: fonts.medium },
  title: { marginTop: 10, fontFamily: fonts.display, fontSize: 15 },
  spinner: { marginVertical: 24 },
})
