import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeader } from '@/components/AppHeader'
import { colors, fonts } from '@/theme'

type IconName = keyof typeof Ionicons.glyphMap

const icon =
  (name: IconName, focusedName: IconName) =>
  ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? focusedName : name} color={color as string} size={size} />
  )

/** The signed-in app: books, photos, spaces, Explore and the account, under the shared header. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.ink500,
        tabBarStyle: { height: 64 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4, borderTopWidth: 1.5, borderTopColor: colors.surface200 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Books', tabBarIcon: icon('book-outline', 'book') }} />
      <Tabs.Screen name="photos" options={{ title: 'Photos', tabBarIcon: icon('images-outline', 'images') }} />
      <Tabs.Screen name="spaces" options={{ title: 'Spaces', tabBarIcon: icon('albums-outline', 'albums') }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: icon('compass-outline', 'compass') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  )
}
