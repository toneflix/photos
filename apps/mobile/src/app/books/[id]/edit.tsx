import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePagination, useRequest } from 'alova/client'
import { PAGE_LAYOUTS, PAPER_COLORS, type BookWithPages, type FrameStyle, type PageLayout, type PaperColor, type Photo } from '@photos/types'
import { BookLookProvider, PAGE_RATIO, PageView } from '@toneflix/flipbook-native'
import { BookSettings, type BookChanges } from '@/components/book/BookSettings'
import { FramePicker } from '@/components/book/FramePicker'
import { LayoutPicker } from '@/components/book/LayoutPicker'
import { PhotoPositionControls } from '@/components/book/PhotoPositionControls'
import { BOOK_FONTS } from '@/components/book/look'
import { Button, Callout, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { BookDraft } from '@/lib/book-draft'
import { useBookCode } from '@/lib/book-codes'
import { confirm } from '@/lib/confirm'
import { FlipbookModel } from '@/lib/flipbook'
import { FormProblem } from '@/lib/forms'
import { bookLists, photoLists } from '@/lib/lists'
import { useSpaces } from '@/lib/spaces'
import { uploads, useUploads } from '@/lib/uploads'
import { colors, fonts, radius } from '@/theme'

const PAPERS = Object.keys(PAPER_COLORS) as PaperColor[]
const THUMB = 64
const SAVE_DELAY = 900

/** Edit a book's pages: layouts, photos, captions, paper and frames. Changes save on their own. */
export default function BookEditor() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const code = useBookCode(id)

  if (code === undefined) return <View style={styles.center} />

  return <LoadBook id={id} code={code} />
}

/** The book with every page, opened with the code this device unlocked it with, if any. */
function LoadBook({ id, code }: { id: string; code: string | null }) {
  const { data, error, loading } = useRequest(() => api.books.get(id, code), { cacheFor: null })
  const book: BookWithPages | undefined = data?.data

  if (!book) {
    return <View style={styles.center}>{loading ? <ActivityIndicator color={colors.ink500} /> : <Callout>{FormProblem.from(error).message ?? 'Book not found'}</Callout>}</View>
  }

  if (!book.canEdit) {
    return (
      <View style={styles.center}>
        <Callout>Only the book's owner, or someone with an editing code, can change it.</Callout>
      </View>
    )
  }

  return <Editor book={book} code={code} />
}

function Editor({ book: loaded, code }: { book: BookWithPages; code: string | null }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const spaces = useSpaces()
  const library = usePagination((page, pageSize) => api.photos.list({ page, per_page: pageSize }), {
    append: true,
    initialPageSize: 60,
    preloadPreviousPage: false,
    preloadNextPage: false,
    total: (response) => response.meta.total,
    data: (response) => response.data,
    middleware: photoLists.middleware,
    immediate: loaded.isOwner,
  })
  const { items: uploading } = useUploads()

  const [book, setBook] = useState(loaded)
  const [draft, setDraft] = useState(() => BookDraft.from(loaded))
  const [layoutsAllowed] = useState(() => loaded.layoutsAllowed && [...new Set([...loaded.layoutsAllowed, ...loaded.pages.map((page) => page.layout)])])
  const [framesAllowed] = useState(
    () =>
      loaded.framesAllowed && [
        ...new Set([
          ...loaded.framesAllowed,
          loaded.frame,
          ...loaded.pages.flatMap((page) => [page.frame, ...page.photos.map((photo) => photo.frame)]).filter((frame): frame is FrameStyle => !!frame),
        ]),
      ],
  )
  const [selected, setSelected] = useState(0)
  const [slot, setSlot] = useState<number | null>(0)
  const [positioning, setPositioning] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const [settings, setSettings] = useState<'closed' | 'open' | 'saving'>('closed')
  const [settingsError, setSettingsError] = useState<string>()
  const latest = useRef({ draft, dirty })

  latest.current = { draft, dirty }

  // Owners pick from their whole library; code holders from the photos already in the book.
  const photos: Photo[] = loaded.isOwner ? (library.data as Photo[]) : BookDraft.from(loaded).photos
  const current = draft.pages[selected]
  const used = draft.usedIds
  const pageWidth = Math.min(width - 96, 420)

  const savePages = async (pages: BookDraft) => {
    setSaving(true)

    try {
      await api.books.savePages(book.id, pages.toInput(), code).send()
      setSaveError(undefined)
    } catch (problem) {
      setSaveError(FormProblem.from(problem).message ?? "Couldn't save")
    } finally {
      setSaving(false)
    }
  }

  // Save shortly after the last change, and right away when leaving.
  useEffect(() => {
    if (!dirty) return

    const timer = setTimeout(() => {
      setDirty(false)
      savePages(draft)
    }, SAVE_DELAY)

    return () => clearTimeout(timer)
  }, [dirty, draft])

  useEffect(
    () => () => {
      const leaving = latest.current.dirty ? api.books.savePages(loaded.id, latest.current.draft.toInput(), code).send() : Promise.resolve()

      leaving.finally(() => bookLists.reload()).catch(() => undefined)
    },
    [],
  )

  const change = (next: BookDraft) => {
    setDraft(next)
    setDirty(true)
  }

  const select = (index: number) => {
    setSelected(index)
    setSlot(0)
  }

  const updateBook = async (changes: BookChanges & { paper?: PaperColor; frame?: FrameStyle }) => {
    setBook((current) => ({ ...current, ...changes }))

    const { data: saved } = await api.books.update(book.id, changes, code).send()

    setBook((current) => ({ ...current, ...saved, pages: current.pages }))
    bookLists.replace(saved)
  }

  const addPage = (layout: PageLayout = 'framed', withPhotos: Photo[] = []) => {
    const at = draft.length ? selected + 1 : 0

    change(draft.insert(at, layout, withPhotos))
    select(at)
  }

  const removePage = async () => {
    if (!(await confirm('Delete this page?', 'Its photos stay in your library.', 'Delete'))) return

    change(draft.remove(selected))
    setSelected(Math.max(0, Math.min(selected, draft.length - 2)))
  }

  const movePage = (to: number) => {
    change(draft.move(selected, to))
    setSelected(Math.max(0, Math.min(to, draft.length - 1)))
  }

  const place = (photo: Photo) => {
    if (!current) {
      addPage('framed', [photo])
      return
    }

    const placed = draft.place(selected, photo, slot)

    if (placed.slot === null) return

    const max = PAGE_LAYOUTS[current.layout].slots

    change(placed.draft)
    setSlot(placed.slot + 1 < max ? placed.slot + 1 : placed.slot)
  }

  const addUnused = () => {
    change(draft.addUnused(photos))
    select(draft.length)
  }

  const upload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, orderedSelection: true, selectionLimit: 50, exif: true, quality: 1 })

    if (!result.canceled) await uploads.add(result.assets, book.spaceId ?? undefined)
  }

  const saveSettings = async (changes: BookChanges) => {
    setSettings('saving')

    try {
      await updateBook(changes)
      setSettingsError(undefined)
      setSettings('closed')
    } catch (problem) {
      setSettingsError(FormProblem.from(problem).message ?? undefined)
      setSettings('open')
    }
  }

  const deleteBook = async () => {
    if (!(await confirm(`Delete “${book.title}”?`, 'Your photos stay in your library.', 'Delete'))) return

    await api.books.remove(book.id).send()
    bookLists.remove(book.id)
    setSettings('closed')
    latest.current.dirty = false
    router.back()
  }

  const status = saveError ? (
    <Text style={styles.statusError}>Couldn't save: {saveError}</Text>
  ) : dirty || saving ? (
    <Text variant="muted" style={styles.status}>
      Saving…
    </Text>
  ) : (
    <View style={styles.saved}>
      <Ionicons name="checkmark" size={14} color={colors.emerald600} />
      <Text variant="muted" style={styles.status}>
        All changes saved
      </Text>
    </View>
  )

  return (
    <BookLookProvider paper={book.paper ?? 'ivory'} frame={book.frame ?? 'none'} fonts={BOOK_FONTS}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.ink900} />
          </Pressable>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.title}>
              {book.title}
            </Text>
            {status}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Book settings" onPress={() => setSettings('open')} hitSlop={8} style={styles.iconButton}>
            <Ionicons name="options-outline" size={22} color={colors.ink900} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" scrollEnabled={!positioning}>
          {current ? (
            <>
              <View style={styles.stage}>
                <PageArrow icon="chevron-back" label="Previous page" disabled={selected === 0} onPress={() => select(selected - 1)} />
                <View style={styles.sheet}>
                  <PageView
                    page={FlipbookModel.page(current)}
                    width={pageWidth}
                    number={selected + 1}
                    onSlotPress={setSlot}
                    activeSlot={slot}
                    onPhotoPosition={(at, position) => change(draft.photoPosition(selected, at, position))}
                    onPositionGesture={setPositioning}
                    accent={colors.brand500}
                  />
                </View>
                <PageArrow icon="chevron-forward" label="Next page" disabled={selected >= draft.length - 1} onPress={() => select(selected + 1)} />
              </View>

              <View style={styles.pageBar}>
                <Text variant="muted">
                  Page {selected + 1} of {draft.length}
                </Text>
                <View style={styles.pageActions}>
                  <IconAction icon="arrow-back" label="Move page earlier" disabled={selected === 0} onPress={() => movePage(selected - 1)} />
                  <IconAction icon="arrow-forward" label="Move page later" disabled={selected >= draft.length - 1} onPress={() => movePage(selected + 1)} />
                  <IconAction icon="trash-outline" label="Delete page" onPress={removePage} danger />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>This book has no pages yet</Text>
              <Text variant="muted" style={styles.centerText}>
                Add a page, then tap photos below to place them. Or fill the book with everything you've uploaded.
              </Text>
              <View style={styles.row}>
                <Button title="Add a page" onPress={() => addPage()} />
                {loaded.isOwner && photos.length > 0 && <Button title="Fill with my photos" variant="secondary" onPress={addUnused} />}
              </View>
            </View>
          )}

          <FlatList
            horizontal
            data={draft.pages}
            keyExtractor={(page) => page.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
            renderItem={({ item: page, index }) => (
              <Pressable onPress={() => select(index)} accessibilityRole="button" accessibilityLabel={`Page ${index + 1}`} accessibilityState={{ selected: index === selected }} style={styles.thumbWrap}>
                <View style={[styles.thumb, index === selected && styles.thumbOn]}>
                  <PageView page={FlipbookModel.page(page)} width={THUMB} />
                </View>
                <Text style={[styles.thumbNumber, index === selected && styles.thumbNumberOn]}>{index + 1}</Text>
              </Pressable>
            )}
            ListFooterComponent={
              <Pressable onPress={() => addPage()} accessibilityRole="button" accessibilityLabel="Add a page" style={[styles.thumb, styles.addThumb]}>
                <Ionicons name="add" size={22} color={colors.ink500} />
              </Pressable>
            }
          />

          {current && slot !== null && current.photos[slot] && (
            <View style={styles.selection}>
              <View style={styles.notice}>
                <Text variant="muted" style={styles.flex}>
                  Photo {slot + 1} is selected. Tap another below to replace it.
                </Text>
                <Text style={styles.remove} accessibilityRole="button" onPress={() => change(draft.removePhoto(selected, slot))}>
                  Remove
                </Text>
              </View>
              <PhotoPositionControls position={current.photos[slot].position} onChange={(position) => change(draft.photoPosition(selected, slot, position))} />
            </View>
          )}

          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.kicker}>{loaded.isOwner ? 'YOUR PHOTOS' : 'PHOTOS IN THIS BOOK'}</Text>
              {photos.some((photo) => !used.has(photo.id)) && (
                <Text variant="link" accessibilityRole="button" onPress={addUnused} style={styles.small}>
                  Add unused as pages
                </Text>
              )}
            </View>
            <FlatList
              horizontal
              data={photos}
              keyExtractor={(photo) => photo.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tray}
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                if (loaded.isOwner && !library.isLastPage && !library.loading && photos.length) library.update({ page: library.page + 1 })
              }}
              ListHeaderComponent={
                loaded.isOwner ? (
                  <Pressable onPress={upload} disabled={uploads.busy} accessibilityRole="button" accessibilityLabel="Upload photos" style={[styles.photo, styles.uploadTile]}>
                    {uploads.busy ? <ActivityIndicator color={colors.ink500} /> : <Ionicons name="cloud-upload-outline" size={22} color={colors.ink700} />}
                    <Text style={styles.uploadText}>{uploads.busy ? `${uploading.filter((item) => item.status === 'done').length}/${uploading.length}` : 'Upload'}</Text>
                  </Pressable>
                ) : undefined
              }
              renderItem={({ item: photo }) => (
                <Pressable onPress={() => place(photo)} accessibilityRole="button" accessibilityLabel={current ? 'Place this photo' : 'Start a page with this photo'} style={styles.photo}>
                  <Image source={{ uri: photo.thumbnailUrl ?? photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  {used.has(photo.id) && (
                    <View style={styles.usedBadge}>
                      <Ionicons name="checkmark" size={11} color={colors.white} />
                    </View>
                  )}
                </Pressable>
              )}
            />
          </View>

          {current && (
            <>
              <LayoutPicker
                value={current.layout}
                allowed={layoutsAllowed}
                onPick={(layout) => {
                  change(draft.layout(selected, layout))
                  setSlot(0)
                }}
              />

              <Input
                value={current.caption}
                onChangeText={(caption) => change(draft.update(selected, { caption }))}
                placeholder={current.layout === 'text' ? 'Write a memory, a quote or a dedication' : `Caption for page ${selected + 1}`}
                maxLength={500}
                multiline={current.layout === 'text'}
              />

              <View style={styles.paperRow} accessibilityRole="radiogroup" accessibilityLabel="Paper colour">
                <Text style={styles.kicker}>PAPER</Text>
                {PAPERS.map((color) => {
                  const on = (book.paper ?? 'ivory') === color

                  return (
                    <Pressable
                      key={color}
                      onPress={() => updateBook({ paper: color }).catch(() => undefined)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${PAPER_COLORS[color].label} paper`}
                      style={[styles.swatch, { backgroundColor: PAPER_COLORS[color].swatch }, on && styles.swatchOn]}
                    />
                  )
                })}
              </View>

              <FramePicker
                key={`${current.key}:${slot}`}
                page={current}
                slot={slot !== null && current.photos[slot] ? slot : null}
                bookFrame={book.frame ?? 'none'}
                allowed={framesAllowed}
                sample={current.photos[0] ?? photos[0] ?? null}
                onPick={(frame) => change(draft.update(selected, { frame }))}
                onPickPhoto={(at, frame) => change(draft.photoFrame(selected, at, frame))}
                onUseEverywhere={(frame) => {
                  change(draft.followBookFrame())
                  updateBook({ frame }).catch(() => undefined)
                }}
              />
            </>
          )}
        </ScrollView>

        {settings !== 'closed' && (
          <BookSettings
            book={book}
            photos={draft.photos}
            spaces={loaded.isOwner ? spaces : []}
            saving={settings === 'saving'}
            error={settingsError}
            onSave={saveSettings}
            onDelete={deleteBook}
            onClose={() => setSettings('closed')}
          />
        )}
      </View>
    </BookLookProvider>
  )
}

function PageArrow({ icon, label, disabled, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={8} style={[styles.arrow, disabled && styles.faded]}>
      <Ionicons name={icon} size={22} color={colors.ink700} />
    </Pressable>
  )
}

function IconAction({ icon, label, disabled, danger, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled?: boolean; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6} style={[styles.iconAction, disabled && styles.faded]}>
      <Ionicons name={icon} size={18} color={danger ? colors.red700 : colors.ink700} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ece6da' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface50, borderBottomWidth: 1, borderBottomColor: colors.surface200 },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink900 },
  status: { fontSize: 12 },
  statusError: { fontSize: 12, color: colors.red700 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { padding: 6 },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sheet: { boxShadow: '0 14px 36px rgba(60,40,20,0.25)' },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  faded: { opacity: 0.3 },
  pageBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageActions: { flexDirection: 'row', gap: 6 },
  iconAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink900 },
  centerText: { textAlign: 'center' },
  strip: { gap: 10, paddingVertical: 2 },
  thumbWrap: { alignItems: 'center', gap: 4 },
  thumb: { width: THUMB, height: THUMB / PAGE_RATIO, borderRadius: 3, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: colors.brand500 },
  thumbNumber: { fontSize: 12, color: colors.ink500 },
  thumbNumberOn: { fontFamily: fonts.semibold, color: colors.ink900 },
  addThumb: { marginLeft: 10, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderColor: colors.surface300, backgroundColor: 'rgba(255,255,255,0.5)' },
  selection: { gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.white },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  remove: { fontFamily: fonts.semibold, color: colors.red700 },
  panel: { gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.white },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kicker: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, color: colors.ink500 },
  small: { fontSize: 13 },
  tray: { gap: 8 },
  photo: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface200 },
  uploadTile: { alignItems: 'center', justifyContent: 'center', gap: 2, marginRight: 8, backgroundColor: colors.surface100, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.surface300 },
  uploadText: { fontSize: 11, fontFamily: fonts.medium, color: colors.ink700 },
  usedBadge: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.8)' },
  paperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  swatchOn: { borderWidth: 3, borderColor: colors.brand500 },
})
