import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePhotoGestures, useNaturalSize } from '@toneflix/flipbook-native'
import type { BookBrandingInput, BookTheme, BookWithPages, CoverDesign, Photo, PhotoPosition, Space, Visibility } from '@photos/types'
import { BookCover } from '@/components/BookCover'
import { BrandingFields, brandingChanges } from '@/components/book/BrandingFields'
import { PhotoPositionControls } from '@/components/book/PhotoPositionControls'
import { ClothPicker, CoverDesignPicker, CoverTextSwitch } from '@/components/book/CoverPickers'
import { Button, Callout, CheckOption, Field, Input, ModalToastHost, Select, Text } from '@/components/ui'
import { useLimits } from '@/lib/limits'
import { webUrl } from '@/lib/links'
import { toast } from '@/lib/toast'
import { spaceOptions } from '@/lib/spaces'
import { colors, fonts, radius } from '@/theme'

export type BookChanges = Partial<Pick<BookWithPages, 'title' | 'description' | 'visibility' | 'coverPhotoId' | 'coverPosition' | 'spaceId' | 'coverDesign' | 'coverText' | 'allowDownloads'> & { theme: BookTheme } & BookBrandingInput>

const VISIBILITY: [Visibility, string][] = [
  ['private', 'Only me'],
  ['shared', 'Anyone with the link'],
]

/** Title, cover and who can open the book, in a sheet over the editor. */
export function BookSettings({
  book,
  photos,
  spaces,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: {
  book: BookWithPages
  photos: Photo[]
  spaces: Space[]
  saving: boolean
  error?: string
  onSave: (changes: BookChanges) => void
  onDelete: () => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState(book.title)
  const [description, setDescription] = useState(book.description ?? '')
  const [theme, setTheme] = useState<BookTheme>(book.theme)
  const [coverDesign, setCoverDesign] = useState<CoverDesign>(book.coverDesign ?? 'classic')
  const [coverText, setCoverText] = useState<boolean | null>(book.coverText ?? null)
  const [visibility, setVisibility] = useState<Visibility>(book.visibility)
  const [allowDownloads, setAllowDownloads] = useState(book.allowDownloads)
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(book.coverPhotoId)
  const [coverPosition, setCoverPosition] = useState<PhotoPosition | null>(book.coverPosition)
  const [positioning, setPositioning] = useState(false)
  const [spaceId, setSpaceId] = useState(book.spaceId ?? '')
  const [branding, setBranding] = useState<BookBrandingInput>(book.customBranding ?? { kicker: null, brand: null, imprint: null })
  const coverPhoto = photos.find((photo) => photo.id === coverPhotoId) ?? null
  const natural = useNaturalSize(coverPhoto && { src: coverPhoto.url, width: coverPhoto.width, height: coverPhoto.height })
  const gestures = usePhotoGestures(coverPosition, COVER_SIZE, natural, coverPhoto ? setCoverPosition : undefined, setPositioning)
  const { bookKicker } = useLimits()
  const kicker = book.brandingAllowed?.kicker ? branding.kicker?.trim() || bookKicker : book.branding.kicker
  const cover = {
    title: title || 'Untitled',
    description,
    theme,
    coverDesign,
    coverText,
    coverPhoto,
    coverPosition: gestures.crop.isCentred ? null : gestures.crop.toJSON(),
    branding: { ...book.branding, kicker },
  }

  const chooseCoverPhoto = (id: string | null) => {
    if (id !== coverPhotoId) setCoverPosition(null)
    setCoverPhotoId(id)
  }
  const shareUrl = webUrl(`/books/${book.id}/view`)

  const save = () =>
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      theme,
      coverDesign,
      coverText,
      coverPhotoId,
      coverPosition,
      ...(book.isOwner ? { visibility, spaceId: spaceId || null, allowDownloads } : {}),
      ...brandingChanges(book, branding),
    })

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.head, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 12 }]}>
          <Text variant="title">Book settings</Text>
          <Text variant="link" accessibilityRole="button" onPress={onClose}>
            Close
          </Text>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" scrollEnabled={!positioning}>
          <View style={styles.cover} {...gestures.handlers}>
            <BookCover book={cover} />
          </View>
          {coverPhoto && <PhotoPositionControls position={coverPosition} onChange={setCoverPosition} />}

          {error ? <Callout>{error}</Callout> : null}
          <Field label="Title">
            <Input value={title} onChangeText={setTitle} maxLength={160} />
          </Field>
          <Field label="Title page text">
            <Input value={description} onChangeText={setDescription} maxLength={2000} multiline />
          </Field>

          <CoverDesignPicker
            book={cover}
            onChange={(design) => {
              setCoverDesign(design)
              setCoverText(null)
            }}
          />
          <CoverTextSwitch design={coverDesign} value={coverText} onChange={setCoverText} />
          <ClothPicker value={theme} onChange={setTheme} />

          <Field label="Cover photo">
            {photos.length ? (
              <View style={styles.photos}>
                <Pressable onPress={() => chooseCoverPhoto(null)} style={[styles.thumb, styles.none, coverPhotoId === null && styles.thumbOn]} accessibilityLabel="No cover photo">
                  <Text variant="muted">None</Text>
                </Pressable>
                {photos.map((photo) => (
                  <Pressable key={photo.id} onPress={() => chooseCoverPhoto(photo.id)} style={[styles.thumb, coverPhotoId === photo.id && styles.thumbOn]} accessibilityLabel={photo.caption ?? 'Photo'}>
                    <Image source={{ uri: photo.thumbnailUrl ?? photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text variant="muted">Add photos to your pages to choose a cover photo.</Text>
            )}
          </Field>

          {book.customBranding && <BrandingFields allowed={book.brandingAllowed} value={branding} onChange={setBranding} />}

          {book.isOwner && spaces.length > 0 && (
            <Field label="Space">
              <Select label="Space" options={spaceOptions(spaces)} value={spaceId} onChange={setSpaceId} />
            </Field>
          )}

          {book.isOwner && (
            <Field label="Who can open it">
              <View style={styles.options}>
                {VISIBILITY.map(([value, label]) => {
                  const checked = visibility === value || (value === 'shared' && visibility === 'public')

                  return (
                    <Pressable key={value} onPress={() => setVisibility(value)} accessibilityRole="radio" accessibilityState={{ checked }} style={[styles.option, checked && styles.optionOn]}>
                      <View style={[styles.radio, checked && styles.radioOn]} />
                      <Text>{label}</Text>
                    </Pressable>
                  )
                })}
              </View>
              {visibility !== 'private' && (
                <View style={styles.share}>
                  <Text selectable numberOfLines={1} style={styles.url}>
                    {shareUrl}
                  </Text>
                  <Button title="Copy" variant="secondary" onPress={() => toast.copy(shareUrl, 'Link copied.')} />
                </View>
              )}
            </Field>
          )}

          {book.isOwner && (
            <CheckOption
              label="Allow downloads"
              description="People who open the book can download its openly licensed photos. Clients with a transfer code always can."
              checked={allowDownloads}
              onPress={() => setAllowDownloads(!allowDownloads)}
            />
          )}

          <Button title={saving ? 'Saving…' : 'Save'} size="lg" loading={saving} disabled={!title.trim()} onPress={save} />
          {book.isOwner && <Button title="Delete book" variant="danger" onPress={onDelete} />}
        </ScrollView>
      </KeyboardAvoidingView>
      <ModalToastHost />
    </Modal>
  )
}

/** The cover preview's size, which a drag on it is measured against. */
const COVER_SIZE = { width: 150, height: 200 }

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.canvas },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.surface200 },
  body: { padding: 20, gap: 18 },
  cover: { alignSelf: 'center', ...COVER_SIZE, borderTopRightRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface100, borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: colors.brand500 },
  none: { alignItems: 'center', justifyContent: 'center', borderColor: colors.surface200 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.surface300 },
  optionOn: { borderColor: colors.ink900 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.surface300 },
  radioOn: { borderWidth: 6, borderColor: colors.ink900 },
  share: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  url: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink700, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface100 },
})
