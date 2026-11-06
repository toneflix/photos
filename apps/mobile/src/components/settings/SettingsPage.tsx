import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

/** A settings screen: a way back, its title and what it's for, then its sections. */
export function SettingsPage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))} hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.ink900} />
        </Pressable>
        <Text variant="display">{title}</Text>
        {description ? <Text variant="muted">{description}</Text> : null}
        <View style={styles.sections}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** A card of related settings. */
export function Section({ title, description, danger, children }: { title?: string; description?: string; danger?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, danger && styles.danger]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text variant="muted">{description}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  page: { paddingHorizontal: 20, gap: 8 },
  back: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4 },
  sections: { gap: 16, marginTop: 16 },
  section: { gap: 14, padding: 16, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.surface200, backgroundColor: colors.white },
  danger: { borderColor: colors.red200 },
  title: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold, color: colors.ink900 },
})
