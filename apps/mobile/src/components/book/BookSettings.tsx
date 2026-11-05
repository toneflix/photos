import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as Clipboard from 'expo-clipboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BookTheme, BookWithPages, Photo, Space, Visibility } from '@photos/types'
import { BookCover, COVERS } from '@/components/BookCover'
import { Button, Callout, Field, Input, Select, Text } from '@/components/ui'
import { webUrl } from '@/lib/links'
import { spaceOptions } from '@/lib/spaces'
import { colors, fonts, radius } from '@/theme'

export type BookChanges = Partial<Pick<BookWithPages, 'title' | 'description' | 'visibility' | 'coverPhotoId' | 'spaceId'> & { theme: BookTheme }>

const THEMES = Object.keys(COVERS) as BookTheme[]
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
  const [visibility, setVisibility] = useState<Visibility>(book.visibility)
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(book.coverPhotoId)
  const [spaceId, setSpaceId] = useState(book.spaceId ?? '')
  const [copied, setCopied] = useState(false)
  const coverPhoto = photos.find((photo) => photo.id === coverPhotoId) ?? null
  const shareUrl = webUrl(`/books/${book.id}`)

  const save = () =>
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      theme,
      coverPhotoId,
      ...(book.isOwner ? { visibility, spaceId: spaceId || null } : {}),
    })

  const copy = async () => {
    await Clipboard.setStringAsync(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.head, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 12 }]}>
          <Text variant="title">Book settings</Text>
          <Text variant="link" accessibilityRole="button" onPress={onClose}>
            Close
          </Text>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.cover}>
            <BookCover book={{ title: title || 'Untitled', description, theme, coverPhoto }} />
          </View>

          {error ? <Callout>{error}</Callout> : null}
          <Field label="Title">
            <Input value={title} onChangeText={setTitle} maxLength={160} />
          </Field>
          <Field label="Title page text">
            <Input value={description} onChangeText={setDescription} maxLength={2000} multiline />
          </Field>

          <Field label="Cover">
            <View style={styles.chips}>
              {THEMES.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setTheme(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: theme === value }}
                  style={[styles.chip, theme === value && styles.chipOn]}
                >
                  <View style={[styles.dot, { backgroundColor: COVERS[value].cloth }]} />
                  <Text style={[styles.chipText, theme === value && styles.chipTextOn]}>{COVERS[value].label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Cover photo">
            {photos.length ? (
              <View style={styles.photos}>
                <Pressable onPress={() => setCoverPhotoId(null)} style={[styles.thumb, styles.none, coverPhotoId === null && styles.thumbOn]} accessibilityLabel="No cover photo">
                  <Text variant="muted">None</Text>
                </Pressable>
                {photos.map((photo) => (
                  <Pressable key={photo.id} onPress={() => setCoverPhotoId(photo.id)} style={[styles.thumb, coverPhotoId === photo.id && styles.thumbOn]} accessibilityLabel={photo.caption ?? 'Photo'}>
                    <Image source={{ uri: photo.thumbnailUrl ?? photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text variant="muted">Add photos to your pages to choose a cover photo.</Text>
            )}
          </Field>

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
                  <Button title={copied ? 'Copied' : 'Copy'} variant="secondary" onPress={copy} />
                </View>
              )}
            </Field>
          )}

          <Button title={saving ? 'Saving…' : 'Save'} size="lg" loading={saving} disabled={!title.trim()} onPress={save} />
          {book.isOwner && <Button title="Delete book" variant="danger" onPress={onDelete} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.white },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.surface200 },
  body: { padding: 20, gap: 18 },
  cover: { alignSelf: 'center', width: 150, height: 200, borderTopRightRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface300 },
  chipOn: { borderColor: colors.ink900, backgroundColor: colors.ink900 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  chipText: { fontSize: 14, color: colors.ink700 },
  chipTextOn: { color: colors.white },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface100, borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: colors.brand500 },
  none: { alignItems: 'center', justifyContent: 'center', borderColor: colors.surface200 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface300 },
  optionOn: { borderColor: colors.ink900 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.surface300 },
  radioOn: { borderWidth: 6, borderColor: colors.ink900 },
  share: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  url: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink700, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface100 },
})
