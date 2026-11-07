import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Logo, Text } from '@/components/ui'
import { Mosaic } from '@/components/Mosaic'
import { colors, fonts, radius } from '@/theme'

/** Layout for sign-in, sign-up and account recovery: a band of photos above the form. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <Mosaic columns={4} style={styles.mosaic} />
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
          <Logo light />
          <Text style={styles.tagline}>Your photos, bound into books you can page through.</Text>
        </View>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 32 }]}>
          <Text variant="display">{title}</Text>
          {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ink900 },
  scroll: { flexGrow: 1 },
  hero: { height: 240, paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 44, overflow: 'hidden' },
  mosaic: { position: 'absolute', top: -24, left: -24, right: -24, opacity: 0.8 },
  tagline: { color: colors.white, fontFamily: fonts.display, fontSize: 22, lineHeight: 28, maxWidth: 300 },
  sheet: {
    flexGrow: 1,
    marginTop: -20,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 6,
  },
  body: { marginTop: 22, gap: 18 },
})
