import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import { LICENSES, licenseFor, type Photo, type PhotoLicense } from '@photos/types'
import { DownloadSheet } from '@/components/DownloadSheet'
import { PhotoScreen } from '@/components/PhotoScreen'
import { Button, Callout, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { FormProblem } from '@/lib/forms'
import { photoLists } from '@/lib/lists'
import { spaceOptions, useSpaces } from '@/lib/spaces'
import { colors, radius } from '@/theme'

type PhotoChanges = Parameters<typeof api.photos.update>[1]

const LICENSE_OPTIONS = LICENSES.map((license) => ({ value: license.value, label: license.label, description: license.forCreators }))

/** One of your photos: who can see it, its space and licence, its caption, and deleting it. */
export default function PhotoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const spaces = useSpaces()
  const [caption, setCaption] = useState('')
  const [downloading, setDownloading] = useState(false)
  const loaded = useRequest(() => api.photos.get(id), { force: true })
  const update = useRequest((changes: PhotoChanges) => api.photos.update(id, changes), { immediate: false }).onSuccess(({ data }) =>
    photoLists.replace(data.data),
  )
  const remove = useRequest(() => api.photos.remove(id), { immediate: false }).onSuccess(() => {
    photoLists.remove(id)
    router.back()
  })
  const photo: Photo | undefined = update.data?.data ?? loaded.data?.data
  const problem = FormProblem.from(update.error ?? remove.error ?? loaded.error)

  useEffect(() => {
    if (loaded.data) setCaption(loaded.data.data.caption ?? '')
  }, [loaded.data])

  const save = (changes: PhotoChanges) => {
    update.send(changes).catch(() => undefined)
  }

  const destroy = async () => {
    if (await confirm('Delete this photo?', 'It will also be removed from any books.', 'Delete')) remove.send().catch(() => undefined)
  }

  if (!photo) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {loaded.error ? <Callout>{problem.message}</Callout> : <ActivityIndicator color={colors.ink500} />}
      </View>
    )
  }

  const license = licenseFor(photo.license)
  const isPublic = photo.visibility === 'public'

  return (
    <PhotoScreen photo={photo} leave="close">
      <View style={styles.body}>
        <View style={styles.meta}>
          {photo.width && photo.height ? (
            <Text variant="muted">
              {photo.width} × {photo.height} px · {(photo.size / 1024 / 1024).toFixed(1)} MB
            </Text>
          ) : null}
          {photo.takenAt ? <Text variant="muted">{new Date(photo.takenAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</Text> : null}
          <Text variant="link" accessibilityRole="button" onPress={() => router.push({ pathname: '/stats/[kind]/[id]', params: { kind: 'photos', id: photo.id } })}>
            See views and downloads
          </Text>
        </View>

        <Button title="Download" variant="secondary" onPress={() => setDownloading(true)} />

        {problem.message ? <Callout>{problem.message}</Callout> : null}

        <View style={styles.panel}>
          <View style={styles.flex}>
            <Text variant="label">Show on Explore</Text>
            <Text variant="muted">{isPublic ? 'Anyone can see this photo.' : 'Only you can see this photo.'}</Text>
            {isPublic && (
              <Text variant="link" accessibilityRole="button" onPress={() => router.push({ pathname: '/explore/photos/[id]', params: { id: photo.id } })}>
                View on Explore
              </Text>
            )}
          </View>
          <Switch
            value={isPublic}
            disabled={update.loading}
            onValueChange={(on) => save({ visibility: on ? 'public' : 'private' })}
            trackColor={{ true: colors.brand600, false: colors.surface300 }}
            thumbColor={colors.white}
            accessibilityLabel="Show on Explore"
          />
        </View>

        {spaces.length > 0 && (
          <Field label="Space">
            <Select
              label="Space"
              options={spaceOptions(spaces)}
              value={photo.spaceId ?? ''}
              disabled={update.loading}
              onChange={(spaceId) => save({ spaceId: spaceId || null })}
            />
          </Field>
        )}

        <Field label="Licence" hint={license.forCreators}>
          <Select<PhotoLicense>
            label="Licence"
            options={LICENSE_OPTIONS}
            value={license.value}
            disabled={update.loading}
            onChange={(value) => save({ license: value })}
          />
        </Field>
        <Text variant="link" accessibilityRole="button" onPress={() => router.push('/licenses')}>
          About licences
        </Text>

        <Field label="Caption">
          <Input value={caption} onChangeText={setCaption} placeholder="Add a caption" multiline maxLength={2000} style={styles.caption} />
        </Field>
        <Button
          title={update.loading ? 'Saving…' : 'Save caption'}
          variant="secondary"
          disabled={update.loading || caption === (photo.caption ?? '')}
          onPress={() => save({ caption: caption.trim() || null })}
        />

        <Button title={remove.loading ? 'Deleting…' : 'Delete photo'} variant="danger" loading={remove.loading} onPress={destroy} style={styles.delete} />
      </View>
      {downloading && <DownloadSheet photo={photo} owned onClose={() => setDownloading(false)} />}
    </PhotoScreen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  flex: { flex: 1, gap: 2 },
  body: { padding: 20, gap: 18 },
  meta: { gap: 2 },
  panel: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.surface200, backgroundColor: colors.white },
  caption: { minHeight: 88, textAlignVertical: 'top' },
  delete: { marginTop: 12 },
})
