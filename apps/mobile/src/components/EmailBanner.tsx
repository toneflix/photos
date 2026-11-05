import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useRequest } from 'alova/client'
import { Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { useUser } from '@/lib/session'
import { colors, fonts } from '@/theme'

/** Asks people with an unconfirmed email to confirm it, with a button to resend the link. */
export function EmailBanner() {
  const user = useUser()
  const [sent, setSent] = useState(false)
  const resend = useRequest(() => api.account.sendVerification(), { immediate: false }).onSuccess(() => setSent(true))

  if (user.emailVerified) return null

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {sent
          ? `We sent a new link to ${user.email}.`
          : resend.error
            ? FormProblem.from(resend.error).message
            : 'Confirm your email so you can always get back into your account.'}
      </Text>
      {!sent && (
        <Pressable accessibilityRole="button" disabled={resend.loading} onPress={() => resend.send().catch(() => undefined)} hitSlop={8}>
          <Text style={[styles.text, styles.action]}>{resend.loading ? 'Sending…' : 'Resend the link'}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amber50,
    borderBottomWidth: 1,
    borderBottomColor: colors.amber200,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  text: { fontSize: 14, lineHeight: 20, color: colors.amber900 },
  action: { fontFamily: fonts.semibold, textDecorationLine: 'underline' },
})
