import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { BookTheme } from '@photos/types'
import { BookCover, COVERS } from '@/components/BookCover'
import { Button, Callout, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { bookLists } from '@/lib/lists'
import { spaceOptions, useSpaces } from '@/lib/spaces'
import { colors, fonts, radius } from '@/theme'

const THEMES = Object.entries(COVERS) as [BookTheme, (typeof COVERS)[BookTheme]][]

/** Start a book: its title, a line for the title page, its cover and its space. */
export default function NewBook() {
  const params = useLocalSearchParams<{ space?: string }>()
  const insets = useSafeAreaInsets()
  const spaces = useSpaces()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState<BookTheme>('classic')
  const [spaceId, setSpaceId] = useState(params.space ?? '')
  const create = useRequest(
    () => api.books.create({ title: title.trim(), description: description.trim() || null, theme, spaceId: spaceId || null }),
    { immediate: false },
  ).onSuccess(({ data }) => {
    bookLists.reload()
    router.replace({ pathname: '/books/[id]/edit', params: { id: data.data.id } })
  })
  const problem = FormProblem.from(create.error)

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text variant="display">A new book</Text>
          <Text variant="link" accessibilityRole="button" onPress={() => router.back()}>
            Cancel
          </Text>
        </View>

        <View style={styles.preview}>
          <View style={styles.cover}>
            <BookCover book={{ title: title || 'Your title', description: description || null, theme }} />
          </View>
        </View>

        {problem.summary ? <Callout>{problem.summary}</Callout> : null}
        <Field label="Title" error={problem.fields.title}>
          <Input value={title} onChangeText={setTitle} invalid={!!problem.fields.title} maxLength={160} placeholder="Summer in Lagos" autoFocus />
        </Field>
        <Field label="A line for the title page (optional)">
          <Input value={description} onChangeText={setDescription} maxLength={2000} placeholder="Two weeks of sun, family and jollof." multiline />
        </Field>
        <Field label="Cover">
          <View style={styles.themes} accessibilityRole="radiogroup">
            {THEMES.map(([value, look]) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: theme === value }}
                onPress={() => setTheme(value)}
                style={[styles.theme, theme === value && styles.themeOn]}
              >
                <View style={[styles.swatch, { backgroundColor: look.cloth, borderColor: look.foil }]} />
                <Text style={[styles.themeText, theme === value && styles.themeTextOn]}>{look.label}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
        {spaces.length > 0 && (
          <Field label="Space">
            <Select label="Space" options={spaceOptions(spaces)} value={spaceId} onChange={setSpaceId} />
          </Field>
        )}
        <Button
          title={create.loading ? 'Creating…' : 'Create book'}
          size="lg"
          loading={create.loading}
          disabled={!title.trim()}
          onPress={() => create.send().catch(() => undefined)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  page: { paddingHorizontal: 20, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { alignItems: 'center' },
  cover: { width: 168, aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  theme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surface300,
  },
  themeOn: { backgroundColor: colors.ink900, borderColor: colors.ink900 },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  themeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink700 },
  themeTextOn: { color: colors.white },
})
