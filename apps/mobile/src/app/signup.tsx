import { useState } from 'react'
import { Link } from 'expo-router'
import { useRequest } from 'alova/client'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { useLimits } from '@/lib/limits'
import { session } from '@/lib/session'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRequest((form: { name: string; email: string; password: string }) => api.auth.register(form), { immediate: false })
  const problem = FormProblem.from(register.error)
  const { registrationOpen } = useLimits()

  const submit = async () => {
    const { data } = await register.send({ name: name.trim(), email: email.trim(), password })

    await session.signIn(data)
  }

  return (
    <AuthFrame
      title="Start your first book"
      subtitle={
        <>
          Already have an account?{' '}
          <Link href="/signin" replace>
            <Text variant="link">Sign in</Text>
          </Link>
        </>
      }
    >
      {!registrationOpen ? (
        <Callout>Sign-ups are closed right now. If you already have an account, sign in instead.</Callout>
      ) : (
        <>
          {problem.summary ? <Callout>{problem.summary}</Callout> : null}
          <Field label="Your name" error={problem.fields.name}>
            <Input value={name} onChangeText={setName} invalid={!!problem.fields.name} autoComplete="name" textContentType="name" autoFocus />
          </Field>
          <Field label="Email" error={problem.fields.email}>
            <Input
              value={email}
              onChangeText={setEmail}
              invalid={!!problem.fields.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </Field>
          <Field label="Password" error={problem.fields.password} hint="At least 8 characters.">
            <Input
              value={password}
              onChangeText={setPassword}
              invalid={!!problem.fields.password}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => submit().catch(() => undefined)}
            />
          </Field>
          <Button
            title={register.loading ? 'Creating your account…' : 'Create account'}
            size="lg"
            loading={register.loading}
            onPress={() => submit().catch(() => undefined)}
          />
        </>
      )}
    </AuthFrame>
  )
}
