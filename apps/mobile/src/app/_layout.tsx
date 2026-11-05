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
        </Stack.Protected>
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="verify-email" />
      </Stack>
    </>
  )
}
