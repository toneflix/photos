import { useEffect } from 'react'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold'
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold'
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium'
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic'
import { api } from '@/lib/api'
import { session, useSession } from '@/lib/session'
import { colors } from '@/theme'

SplashScreen.preventAutoHideAsync()
session.restore(async () => (await api.auth.me()).data)

export default function RootLayout() {
  const { status, user } = useSession()
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Fraunces_500Medium,
    Fraunces_400Regular_Italic,
  })
  const ready = status === 'ready' && (fontsLoaded || !!fontError)

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
        <Stack.Protected guard={!!user} redirectTo="/welcome">
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!user} redirectTo="/">
          <Stack.Screen name="welcome" />
          <Stack.Screen name="signin" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="discover" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="photo/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="books/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="space-form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="books/[id]/access" />
          <Stack.Screen name="settings" />
        </Stack.Protected>
        <Stack.Screen name="explore/photos/[id]" />
        <Stack.Screen name="spaces/[slug]" />
        <Stack.Screen name="licenses" />
        <Stack.Screen name="unlock" />
        <Stack.Screen name="books/[id]/index" />
        <Stack.Screen name="books/[id]/edit" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="verify-email" />
      </Stack>
    </>
  )
}
