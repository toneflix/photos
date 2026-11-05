import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, radius } from '@/theme'
import { Text } from './Text'

const tones = {
  alert: { box: { backgroundColor: colors.red50, borderColor: colors.red200 }, text: colors.red800, role: 'alert' },
  notice: { box: { backgroundColor: colors.emerald50, borderColor: colors.emerald200 }, text: colors.emerald900, role: 'summary' },
  warning: { box: { backgroundColor: colors.amber50, borderColor: colors.amber200 }, text: colors.amber900, role: 'summary' },
} as const

/** A boxed message: `alert` for errors, `notice` for good news, `warning` for things to act on. */
export function Callout({ tone = 'alert', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const look = tones[tone]

  return (
    <View accessibilityRole={look.role} style={[styles.box, look.box]}>
      <Text style={[styles.text, { color: look.text }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  text: { fontSize: 14, lineHeight: 20 },
})
