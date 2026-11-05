import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import { colors } from '@/theme'

/** A centred icon, title and line of text for screens with nothing to show yet. */
export function EmptyState({ icon, title, text, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; children?: ReactNode }) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={28} color={colors.brand700} />
      </View>
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      <Text variant="muted" style={styles.center}>
        {text}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  center: { textAlign: 'center', maxWidth: 320 },
})
