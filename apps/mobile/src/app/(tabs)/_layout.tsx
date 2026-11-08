import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeader } from '@/components/AppHeader'
import { GlassBackground, GlassScene, GlassTabBar, GlassTabs, glassTabBarStyle } from '@/components/GlassTabBar'
import { colors, fonts } from '@/theme'

type IconName = keyof typeof Ionicons.glyphMap

const icon =
  (name: IconName, focusedName: IconName) =>
  ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? focusedName : name} color={color as string} size={size} />
  )

/** The signed-in app: books, photos, spaces, Explore and the account, under the shared header and over the glass tab bar. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <GlassTabs>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenLayout={({ route, children }) => <GlassScene routeKey={route.key}>{children}</GlassScene>}
        screenOptions={{
          header: () => <AppHeader />,
          tabBarActiveTintColor: colors.brand600,
          tabBarInactiveTintColor: colors.ink500,
          tabBarStyle: { ...glassTabBarStyle, height: 64 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 },
          tabBarBackground: () => <GlassBackground />,
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
    </GlassTabs>
  )
}
