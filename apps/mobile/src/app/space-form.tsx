import { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { Space, SpaceVisibility } from '@photos/types'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { FormProblem } from '@/lib/forms'
import { spaceLists } from '@/lib/lists'
import { colors, radius } from '@/theme'

/** Create a space, or change or delete one when opened with `?id=`. */
export default function SpaceForm() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<SpaceVisibility>('private')
  const existing = useRequest(() => api.spaces.get(id!), { immediate: !!id })
  const details = () => ({ name: name.trim(), slug: slug.trim() || undefined, description: description.trim() || null, visibility })
  const save = useRequest(() => (id ? api.spaces.update(id, details()) : api.spaces.create(details())), { immediate: false }).onSuccess(() => {
    spaceLists.reload()
    router.back()
  })
  const remove = useRequest(() => api.spaces.remove(id!), { immediate: false }).onSuccess(() => {
    spaceLists.reload()
    router.back()
  })
  const problem = FormProblem.from(save.error ?? remove.error)

  useEffect(() => {
    const space: Space | undefined = existing.data?.data

    if (!space) return

    setName(space.name)
    setSlug(space.slug)
    setDescription(space.description ?? '')
    setVisibility(space.visibility)
  }, [existing.data])

  const destroy = async () => {
    const ok = await confirm('Delete this space?', 'Its photos and books stay in your library, just outside any space.', 'Delete')

    if (ok) remove.send().catch(() => undefined)
  }

  if (id && !existing.data) {
    return (
      <View style={styles.center}>{existing.error ? <Callout>{FormProblem.from(existing.error).message}</Callout> : <ActivityIndicator color={colors.ink500} />}</View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text variant="display">{id ? 'Edit space' : 'A new space'}</Text>
          <Text variant="link" accessibilityRole="button" onPress={() => router.back()}>
            Cancel
          </Text>
        </View>

        {problem.summary ? <Callout>{problem.summary}</Callout> : null}
        <Field label="Name" error={problem.fields.name}>
          <Input value={name} onChangeText={setName} invalid={!!problem.fields.name} maxLength={80} placeholder="Ada Okafor Weddings" autoFocus={!id} />
        </Field>
        <Field
          label="Web address"
          error={problem.fields.slug}
          hint={id ? "Changing it breaks links you've already shared." : 'Leave empty to make one from the name. Lowercase letters, numbers and dashes.'}
        >
          <Input
            value={slug}
            onChangeText={(text) => setSlug(text.toLowerCase())}
            invalid={!!problem.fields.slug}
            maxLength={60}
            placeholder="ada-weddings"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <Field label="About this space (optional)" error={problem.fields.description}>
          <Input value={description} onChangeText={setDescription} maxLength={1000} placeholder="Weddings and celebrations across Lagos." multiline />
        </Field>
        <View style={styles.panel}>
          <View style={styles.flex}>
            <Text variant="label">Public space</Text>
            <Text variant="muted">
              {visibility === 'public'
                ? 'Anyone can browse its public photos and books, and it shows on Explore.'
                : 'Only you and the people you invite can open it. Its photos and books stay off Explore.'}
            </Text>
          </View>
          <Switch
            value={visibility === 'public'}
            onValueChange={(on) => setVisibility(on ? 'public' : 'private')}
            trackColor={{ true: colors.brand700, false: colors.surface300 }}
            thumbColor={colors.white}
            accessibilityLabel="Public space"
          />
        </View>
        <Button
          title={save.loading ? 'Saving…' : id ? 'Save' : 'Create space'}
          size="lg"
          loading={save.loading}
          disabled={!name.trim()}
          onPress={() => save.send().catch(() => undefined)}
        />
        {id && <Button title={remove.loading ? 'Deleting…' : 'Delete space'} variant="danger" loading={remove.loading} onPress={destroy} />}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  page: { paddingHorizontal: 20, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panel: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface100 },
})
