import { ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useRequest } from 'alova/client'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { session, useSession } from '@/lib/session'
import { colors } from '@/theme'

/** Opened from the emailed confirmation link; confirms the address straight away. */
export default function VerifyEmail() {
  const { token = '', email } = useLocalSearchParams<{ token?: string; email?: string }>()
  const { user } = useSession()
  const { loading, error, data } = useRequest(() => api.auth.verifyEmail({ token, email: email || undefined })).onSuccess(({ data: response }) => {
    if (user?.id === response.data.id) session.setUser(response.data)
  })
  const next = user ? { href: '/' as const, label: 'Go to your books' } : { href: '/signin' as const, label: 'Sign in' }

  if (loading) {
    return (
      <AuthFrame title="Confirming your email…">
        <ActivityIndicator color={colors.brand700} />
      </AuthFrame>
    )
  }

  if (error || !data) {
    return (
      <AuthFrame title="We couldn't confirm it" subtitle={FormProblem.from(error).message ?? undefined}>
        <Text variant="muted">
          Links work for 24 hours and only for the address they were sent to. You can send a new one from your account.
        </Text>
        <Button title={next.label} size="lg" onPress={() => router.replace(next.href)} />
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Email confirmed" subtitle={`${data.data.email} is confirmed.`}>
      <Button title={next.label} size="lg" onPress={() => router.replace(next.href)} />
    </AuthFrame>
  )
}
