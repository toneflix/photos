import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { EmailBanner } from '@/components/EmailBanner'
import { Logo } from '@/components/ui'
import { useUser } from '@/lib/session'
import { colors } from '@/theme'

/** The top bar on the signed-in tabs: the logo, the account avatar, and the email reminder. */
export function AppHeader() {
  const user = useUser()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Logo size={28} />
        <Pressable accessibilityRole="button" accessibilityLabel="Your account" onPress={() => router.navigate('/account')} hitSlop={8}>
          <Avatar user={user} size={34} />
        </Pressable>
      </View>
      <EmailBanner />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white, borderBottomWidth: 1.5, borderBottomColor: colors.surface200 },
  bar: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
