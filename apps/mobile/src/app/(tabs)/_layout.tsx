import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@/components/AppHeader'
import { colors, fonts } from '@/theme'

type IconName = keyof typeof Ionicons.glyphMap

const icon =
  (name: IconName, focusedName: IconName) =>
  ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? focusedName : name} color={color as string} size={size} />
  )

/** The signed-in app: books, photos, Explore and the account, under the shared header. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: colors.ink900,
        tabBarInactiveTintColor: colors.ink500,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Books', tabBarIcon: icon('book-outline', 'book') }} />
      <Tabs.Screen name="photos" options={{ title: 'Photos', tabBarIcon: icon('images-outline', 'images') }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: icon('compass-outline', 'compass') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  )
}
