import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Avatar } from '@/components/Avatar'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { megabytes, useLimits } from '@/lib/limits'
import { session, useUser } from '@/lib/session'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { webUrl } from '@/lib/links'

export default function Profile() {
  const user = useUser()
  const { maxAvatarMb } = useLimits()
  const photo = useAction()
  const profile = useAction()
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)

  const pick = () =>
    photo.run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 })

      if (result.canceled) return

      const asset = result.assets[0]

      if (asset.fileSize && asset.fileSize > megabytes(maxAvatarMb)) throw new Error(`That photo is larger than ${maxAvatarMb} MB.`)

      const { data } = await api.account.updateAvatar(uploadFile(asset)).send()

      await session.setUser(data)

      return 'Profile photo updated.'
    })

  const removePhoto = () =>
    photo.run(async () => {
      const { data } = await api.account.removeAvatar().send()

      await session.setUser(data)

      return 'Profile photo removed.'
    })

  const save = () =>
    profile.run(async () => {
      const { data } = await api.account.updateProfile({ name: name.trim(), username: username.trim() }).send()

      await session.setUser(data)

      return 'Saved.'
    })

  return (
    <SettingsPage title="Profile" description="How you appear on the books you share.">
      <Section title="Photo">
        <View style={styles.photo}>
          <Avatar user={user} size={72} />
          <View style={styles.photoActions}>
            <View style={styles.row}>
              <Button title={photo.busy ? 'Uploading…' : user.avatarUrl ? 'Change photo' : 'Add a photo'} variant="secondary" loading={photo.busy} onPress={pick} />
              {user.avatarUrl ? <Button title="Remove" variant="ghost" disabled={photo.busy} onPress={removePhoto} /> : null}
            </View>
            <Text variant="small">{`JPG, PNG, WebP or HEIC, up to ${maxAvatarMb} MB.`}</Text>
          </View>
        </View>
        {photo.problem.message ? <Callout>{photo.problem.fields.avatar ?? photo.problem.message}</Callout> : null}
      </Section>

      <Section title="Name and username">
        <Field label="Your name" error={profile.problem.fields.name}>
          <Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={120} />
        </Field>
        <Field
          label="Username"
          error={profile.problem.fields.username}
          hint={`Your profile lives at ${webUrl(`/makers/${user.username}`)}. Use 3 to 30 lower case letters, numbers or underscores.`}
        >
          <Input
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            maxLength={30}
          />
        </Field>
        {profile.problem.summary ? <Callout>{profile.problem.summary}</Callout> : null}
        <Button title={profile.busy ? 'Saving…' : 'Save'} loading={profile.busy} disabled={!name.trim() || !username.trim()} onPress={save} />
      </Section>
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  photo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoActions: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
