import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { BookTheme } from '@photos/types'
import { BookCover } from '@/components/BookCover'
import { ClothPicker } from '@/components/book/CoverPickers'
import { Button, Callout, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { bookLists } from '@/lib/lists'
import { spaceOptions, useSpaces } from '@/lib/spaces'
import { colors, radius } from '@/theme'

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
        <ClothPicker value={theme} onChange={setTheme} />
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
  flex: { flex: 1, backgroundColor: colors.canvas },
  page: { paddingHorizontal: 20, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { alignItems: 'center' },
  cover: { width: 168, aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
})
