import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ExploreScreen } from '@/components/explore/ExploreScreen'
import { Button, Logo } from '@/components/ui'
import { colors } from '@/theme'

/** Explore for visitors, with a way to sign in or join. */
export default function Discover() {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.page}>
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <Logo size={28} />
        <View style={styles.actions}>
          <Button title="Sign in" variant="ghost" onPress={() => router.push('/signin')} />
          <Button title="Join free" onPress={() => router.push('/signup')} />
        </View>
      </View>
      <ExploreScreen />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface300,
  },
  actions: { flexDirection: 'row', gap: 4 },
})
