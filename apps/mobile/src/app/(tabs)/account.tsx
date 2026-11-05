import { ScrollView, StyleSheet, View } from 'react-native'
import { useRequest } from 'alova/client'
import { Avatar } from '@/components/Avatar'
import { Button, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { session, useUser } from '@/lib/session'
import { colors, radius } from '@/theme'

/** Who is signed in, and a way out. */
export default function Account() {
  const user = useUser()
  const logout = useRequest(() => api.auth.logout(), { immediate: false })

  const signOut = async () => {
    await logout.send().catch(() => undefined)
    await session.clear()
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Avatar user={user} size={56} />
        <View style={styles.who}>
          <Text variant="title" numberOfLines={1}>
            {user.name}
          </Text>
          <Text variant="muted" numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>
      <Button title={logout.loading ? 'Signing out…' : 'Sign out'} variant="secondary" size="lg" loading={logout.loading} onPress={signOut} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface200,
  },
  who: { flex: 1, gap: 2 },
})
