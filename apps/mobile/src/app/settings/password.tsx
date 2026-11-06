import { useState } from 'react'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input } from '@/components/ui'
import { api } from '@/lib/api'
import { useAction } from '@/lib/use-action'

export default function Password() {
  const change = useAction()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')

  const save = () =>
    change.run(async () => {
      await api.account.updatePassword({ currentPassword: current, password, password_confirmation: again }).send()

      setCurrent('')
      setPassword('')
      setAgain('')

      return 'Password changed. Your other devices were signed out.'
    })

  return (
    <SettingsPage title="Password" description="Changing it signs you out on every other device.">
      <Section>
        <Field label="Current password" error={change.problem.fields.currentPassword}>
          <Input value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" textContentType="password" />
        </Field>
        <Field label="New password" error={change.problem.fields.password} hint="At least 8 characters.">
          <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        </Field>
        <Field label="Type it again" error={change.problem.fields.password_confirmation}>
          <Input value={again} onChangeText={setAgain} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        </Field>
        {change.problem.summary ? <Callout>{change.problem.summary}</Callout> : null}
        <Button title={change.busy ? 'Saving…' : 'Change password'} loading={change.busy} disabled={!current || password.length < 8 || !again} onPress={save} />
      </Section>
    </SettingsPage>
  )
}
