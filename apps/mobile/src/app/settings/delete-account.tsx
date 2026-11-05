import { useState } from 'react'
import { router } from 'expo-router'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { session } from '@/lib/session'
import { useAction } from '@/lib/use-action'

export default function DeleteAccount() {
  const remove = useAction()
  const [password, setPassword] = useState('')

  const destroy = async () => {
    if (!(await confirm('Delete your account?', 'Every book and photo goes for good. This cannot be undone.', 'Delete everything'))) return

    await remove.run(async () => {
      await api.account.remove({ password }).send()
      await session.clear()
    })
  }

  return (
    <SettingsPage title="Delete account">
      <Section danger>
        <Text>This deletes your account, every book and every photo for good. Links you've shared stop working.</Text>
        <Text variant="muted">
          Want to keep them?{' '}
          <Text variant="link" accessibilityRole="link" onPress={() => router.push('/settings/data')}>
            Download your data
          </Text>{' '}
          first.
        </Text>
        <Field label="Enter your password to confirm" error={remove.problem.fields.password}>
          <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
        </Field>
        {remove.problem.summary ? <Callout>{remove.problem.summary}</Callout> : null}
        <Button title={remove.busy ? 'Deleting…' : 'Delete everything'} variant="danger" loading={remove.busy} disabled={!password} onPress={destroy} />
      </Section>
    </SettingsPage>
  )
}
