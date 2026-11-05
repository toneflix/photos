import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Logo, Text } from '@/components/ui'
import { Mosaic } from '@/components/Mosaic'
import { colors, fonts } from '@/theme'

/** The first screen for visitors: a wall of photos and a way in. */
export default function Welcome() {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <Mosaic columns={4} style={styles.mosaic} />
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />

      <Logo light />

      <View style={styles.copy}>
        <Text style={styles.headline}>Your photos, bound into books that last for all time.</Text>
        <Text style={styles.lede}>
          Upload your favourite moments, lay them out page by page, and turn through them like a real album. Turn your phone sideways and the book
          opens across two pages.
        </Text>
        <View style={styles.actions}>
          <Button title="Create your first book" size="lg" onPress={() => router.push('/signup')} />
          <Button title="I have an account" size="lg" variant="glass" onPress={() => router.push('/signin')} />
          <Text variant="link" accessibilityRole="button" style={styles.browse} onPress={() => router.push('/discover')}>
            Browse photos on Explore
          </Text>
          <Text variant="link" accessibilityRole="button" style={styles.browse} onPress={() => router.push('/unlock')}>
            Have a code? Open a book
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink900, paddingHorizontal: 20, justifyContent: 'space-between', overflow: 'hidden' },
  mosaic: { position: 'absolute', top: -40, left: -40, right: -40, opacity: 0.7 },
  copy: { gap: 16 },
  headline: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.white },
  lede: { fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.8)' },
  actions: { gap: 12, marginTop: 12 },
  browse: { alignSelf: 'center', marginTop: 4, color: colors.white },
})
