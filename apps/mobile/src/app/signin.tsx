import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { useRequest } from 'alova/client'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Callout, Field, Input, OtpInput, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { session } from '@/lib/session'

/** Signs in with email and password, then with a two-step code when the account asks for one. */
export default function SignIn() {
  const { reset } = useLocalSearchParams<{ reset?: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState<string | null>(null)
  const login = useRequest((form: { email: string; password: string }) => api.auth.login(form), { immediate: false })
  const problem = FormProblem.from(login.error)

  const submit = async () => {
    const { data } = await login.send({ email: email.trim(), password })

    if (data.twoFactor) setChallengeToken(data.challengeToken)
    else await session.signIn(data)
  }

  if (challengeToken) return <TwoStep challengeToken={challengeToken} />

  return (
    <AuthFrame
      title="Welcome back"
      subtitle={
        <>
          New here?{' '}
          <Link href="/signup" replace>
            <Text variant="link">Create an account</Text>
          </Link>
        </>
      }
    >
      {reset && !login.error ? <Callout tone="notice">Your password was changed. Sign in with the new one.</Callout> : null}
      {problem.summary ? <Callout>{problem.summary}</Callout> : null}
      <Field label="Email" error={problem.fields.email}>
        <Input
          value={email}
          onChangeText={setEmail}
          invalid={!!problem.fields.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          autoFocus
        />
      </Field>
      <Field label="Password" error={problem.fields.password}>
        <Input
          value={password}
          onChangeText={setPassword}
          invalid={!!problem.fields.password}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => submit().catch(() => undefined)}
        />
      </Field>
      <View style={styles.forgot}>
        <Link href="/forgot-password">
          <Text variant="muted">Forgot your password?</Text>
        </Link>
      </View>
      <Button title={login.loading ? 'Signing in…' : 'Sign in'} size="lg" loading={login.loading} onPress={() => submit().catch(() => undefined)} />
    </AuthFrame>
  )
}

/** The second step: an authenticator code, or one of the saved recovery codes. */
function TwoStep({ challengeToken }: { challengeToken: string }) {
  const [recovery, setRecovery] = useState(false)
  const [code, setCode] = useState('')
  const verify = useRequest((form: { challengeToken: string; code?: string; recoveryCode?: string }) => api.auth.twoFactor(form), { immediate: false })
  const problem = FormProblem.from(verify.error)

  const submit = async (entered = code) => {
    const { data } = await verify.send(recovery ? { challengeToken, recoveryCode: entered.trim() } : { challengeToken, code: entered })

    await session.signIn(data)
  }

  const toggle = () => {
    setRecovery(!recovery)
    setCode('')
  }

  return (
    <AuthFrame
      title="Two-step sign-in"
      subtitle={
        recovery
          ? 'Enter one of the recovery codes you saved when you turned on two-step sign-in.'
          : 'Open your authenticator app and enter the 6-digit code for Toneflix Photos.'
      }
    >
      {problem.message ? <Callout>{problem.message}</Callout> : null}
      <Field label={recovery ? 'Recovery code' : 'Code'}>
        {recovery ? (
          <Input key="recovery" value={code} onChangeText={setCode} placeholder="XXXX-XXXX" autoCapitalize="characters" autoCorrect={false} autoFocus />
        ) : (
          <OtpInput
            key="code"
            value={code}
            onChange={setCode}
            onComplete={(entered) => submit(entered).catch(() => setCode(''))}
            invalid={!!problem.message}
            disabled={verify.loading}
            autoFocus
          />
        )}
      </Field>
      <Button title={verify.loading ? 'Checking…' : 'Continue'} size="lg" loading={verify.loading} onPress={() => submit().catch(() => undefined)} />
      <Pressable accessibilityRole="button" onPress={toggle} style={styles.toggle}>
        <Text variant="muted">{recovery ? 'Use your authenticator app instead' : "Can't use your app? Use a recovery code"}</Text>
      </Pressable>
    </AuthFrame>
  )
}

const styles = StyleSheet.create({
  forgot: { alignItems: 'flex-end', marginTop: -8 },
  toggle: { alignItems: 'center', paddingVertical: 8 },
})
