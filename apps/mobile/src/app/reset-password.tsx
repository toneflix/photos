import { useState } from 'react'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { useRequest } from 'alova/client'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { session } from '@/lib/session'

/** Opened from the emailed reset link. Saving signs out every device, this one included. */
export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const reset = useRequest((form: { token: string; password: string; password_confirmation: string }) => api.auth.resetPassword(form), {
    immediate: false,
  })
  const problem = FormProblem.from(reset.error)
  const subtitle = (
    <>
      Need a new link?{' '}
      <Link href="/forgot-password">
        <Text variant="link">Send another</Text>
      </Link>
    </>
  )

  const submit = async () => {
    await reset.send({ token: token ?? '', password, password_confirmation: confirmation })
    await session.clear()

    router.replace({ pathname: '/signin', params: { reset: '1' } })
  }

  if (!token) {
    return (
      <AuthFrame title="This link is incomplete" subtitle={subtitle}>
        <Text variant="muted">Open the reset link from your email again, or ask for a new one.</Text>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Choose a new password" subtitle={subtitle}>
      {problem.summary ? <Callout>{problem.summary}</Callout> : null}
      <Field label="New password" error={problem.fields.password} hint="At least 8 characters.">
        <Input
          value={password}
          onChangeText={setPassword}
          invalid={!!problem.fields.password}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          autoFocus
        />
      </Field>
      <Field label="Type it again">
        <Input value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      </Field>
      <Text variant="small">Every device signed in to your account will be signed out.</Text>
      <Button title={reset.loading ? 'Saving…' : 'Save new password'} size="lg" loading={reset.loading} onPress={() => submit().catch(() => undefined)} />
    </AuthFrame>
  )
}
