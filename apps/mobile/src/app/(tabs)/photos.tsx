import { useMemo, useState } from 'react'
import { ActivityIndicator, SectionList, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { usePagination } from 'alova/client'
import { autoLayout, type Photo } from '@photos/types'
import { PhotoTile } from '@/components/PhotoTile'
import { SearchFilters } from '@/components/SearchFilters'
import { UploadProgress } from '@/components/UploadProgress'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { ORIENTATION_FILTER, PHOTO_VISIBILITY_FILTER, SORT_FILTER, spaceFilter, useFilters } from '@/lib/filters'
import { FormProblem } from '@/lib/forms'
import { bookLists, photoLists } from '@/lib/lists'
import { useSpaces } from '@/lib/spaces'
import { uploads, useUploads } from '@/lib/uploads'
import { colors, fonts, radius } from '@/theme'

const COLUMNS = 3
const GAP = 6
const PADDING = 16

/** Group photos by the month they were taken (or uploaded), in rows for the grid. */
function groupByMonth(photos: Photo[], oldest: boolean) {
  const groups = new Map<string, { title: string; photos: Photo[] }>()

  for (const photo of photos) {
    const date = new Date(photo.takenAt ?? photo.createdAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!groups.has(key)) groups.set(key, { title: date.toLocaleDateString('en', { month: 'long', year: 'numeric' }), photos: [] })
    groups.get(key)!.photos.push(photo)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (oldest ? a.localeCompare(b) : b.localeCompare(a)))
    .map(([, group]) => ({
      title: group.title,
      photos: group.photos,
      data: Array.from({ length: Math.ceil(group.photos.length / COLUMNS) }, (_, row) => group.photos.slice(row * COLUMNS, row * COLUMNS + COLUMNS)),
    }))
}

/** Your photo library: upload from the camera roll, search, open a photo, or pick some for a new book. */
export default function Photos() {
  const { width } = useWindowDimensions()
  const params = useLocalSearchParams<{ space?: string }>()
  const filters = useFilters(params.space ? { space: params.space } : undefined)
  const spaces = useSpaces()
  const { items: uploading } = useUploads()
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const tile = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS
  const space = spaces.find((item) => item.id === filters.query.space) ?? null

  const list = usePagination((page, pageSize) => api.photos.list({ ...filters.query, page, per_page: pageSize }), {
    append: true,
    initialPageSize: 60,
    preloadPreviousPage: false,
    preloadNextPage: false,
    total: (response) => response.meta.total,
    data: (response) => response.data,
    watchingStates: [filters.key],
    middleware: photoLists.middleware,
  })
  const photos = list.data as Photo[]
  const total = list.total ?? 0
  const groups = useMemo(() => groupByMonth(photos, filters.query.sort === 'oldest'), [photos, filters.query.sort])

  const upload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, orderedSelection: true, selectionLimit: 50, exif: true, quality: 1 })

    if (!result.canceled) await uploads.add(result.assets, space?.id)
  }

  const toggle = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  const stopSelecting = () => {
    setSelecting(false)
    setPicked([])
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text variant="display">Your photos</Text>
          <Text variant="muted">
            {filters.active
              ? space
                ? `${total} ${total === 1 ? 'photo' : 'photos'} in ${space.name}.`
                : `${total} ${total === 1 ? 'photo matches' : 'photos match'}.`
              : total === 0
                ? 'Upload the photos you want in your books.'
                : `${total} ${total === 1 ? 'photo' : 'photos'} in your library.`}
          </Text>
        </View>
      </View>
      {selecting ? (
        <Button title="Cancel" variant="ghost" onPress={stopSelecting} />
      ) : (
        <View style={styles.actions}>
          <Button title="Upload photos" style={styles.flex} disabled={uploads.busy} onPress={() => upload().catch(() => undefined)} />
          {total > 0 && <Button title="Make a book" variant="secondary" style={styles.flex} onPress={() => setSelecting(true)} />}
        </View>
      )}
      {uploading.length > 0 && <UploadProgress />}
      {(total > 0 || filters.active || spaces.length > 0) && (
        <SearchFilters
          placeholder="Search your photos by caption"
          filters={[...(spaces.length ? [spaceFilter(spaces)] : []), ORIENTATION_FILTER, PHOTO_VISIBILITY_FILTER, SORT_FILTER]}
          values={filters.values}
          onChange={filters.set}
        />
      )}
      {list.error ? <Callout>{FormProblem.from(list.error).message}</Callout> : null}
      {filters.active && total === 0 && !list.loading && <Text variant="muted">No photos match. Try other words or clear the filters.</Text>}
    </View>
  )

  return (
    <View style={styles.flex}>
      <SectionList
        sections={groups}
        keyExtractor={(row) => row[0].id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.month}>
            <Text variant="title">{section.title}</Text>
            {selecting && (
              <Text
                variant="link"
                accessibilityRole="button"
                onPress={() => {
                  const ids = section.photos.map((photo) => photo.id)
                  const all = ids.every((id) => picked.includes(id))

                  setPicked((current) => (all ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]))
                }}
              >
                {section.photos.every((photo) => picked.includes(photo.id)) ? 'Clear month' : 'Select month'}
              </Text>
            )}
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                size={tile}
                selecting={selecting}
                order={picked.indexOf(photo.id)}
                onPress={() => (selecting ? toggle(photo.id) : router.push({ pathname: '/photo/[id]', params: { id: photo.id } }))}
              />
            ))}
          </View>
        )}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (!list.isLastPage && !list.loading && photos.length) list.update({ page: list.page + 1 })
        }}
        refreshing={false}
        onRefresh={() => list.reload()}
        ListFooterComponent={list.loading ? <ActivityIndicator style={styles.spinner} color={colors.ink500} /> : undefined}
        contentContainerStyle={[styles.content, selecting && styles.roomForBar]}
      />
      {selecting && <SelectionBar picked={picked} spaceId={space?.id} onDone={stopSelecting} />}
    </View>
  )
}

/** Floating bar for turning the picked photos into a new book. */
function SelectionBar({ picked, spaceId, onDone }: { picked: string[]; spaceId?: string; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const make = async () => {
    setBusy(true)
    setError(null)

    try {
      const { data: book } = await api.books.create({ title: title.trim() || 'Untitled book', spaceId: spaceId ?? null })

      await api.books.savePages(book.id, autoLayout(picked))
      bookLists.reload()
      onDone()
      router.push({ pathname: '/books/[id]/edit', params: { id: book.id } })
    } catch (problem) {
      setError(problem)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.bar}>
      <Text style={styles.barText}>
        <Text style={[styles.barText, styles.bold]}>{picked.length}</Text> {picked.length === 1 ? 'photo' : 'photos'} picked
      </Text>
      {error ? <Text style={styles.barError}>{FormProblem.from(error).message}</Text> : null}
      <View style={styles.barRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Name your book"
          placeholderTextColor="rgba(255,255,255,0.5)"
          maxLength={160}
          style={styles.barInput}
        />
        <Button
          title={busy ? 'Making…' : 'Make a book'}
          loading={busy}
          disabled={!picked.length}
          onPress={make}
          style={styles.barButton}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: PADDING, paddingBottom: 32 },
  roomForBar: { paddingBottom: 180 },
  header: { gap: 14, paddingTop: 20, paddingBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.94)' },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  spinner: { marginVertical: 24 },
  bar: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.ink900, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' },
  barText: { color: colors.white, fontSize: 14 },
  bold: { fontFamily: fonts.semibold },
  barError: { color: '#fca5a5', fontSize: 13 },
  barRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  barButton: { flexShrink: 0 },
  barInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: colors.white,
    fontFamily: fonts.body,
  },
})
