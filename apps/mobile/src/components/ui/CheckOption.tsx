import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { colors, fonts, radius } from '@/theme'

/** A checkbox row with a label and a line explaining it. Disabled rows show a fixed choice. */
export function CheckOption({ label, description, checked, disabled, onPress }: { label: string; description: string; checked: boolean; disabled?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} style={[styles.option, disabled && styles.optionFixed]}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Ionicons name="checkmark" size={14} color={colors.white} />}</View>
      <View style={styles.flex}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text variant="muted">{description}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  option: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface300 },
  optionFixed: { backgroundColor: colors.surface100 },
  optionLabel: { fontFamily: fonts.semibold, color: colors.ink900 },
  box: { width: 20, height: 20, marginTop: 2, borderRadius: 5, borderWidth: 2, borderColor: colors.surface300, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: colors.ink900, backgroundColor: colors.ink900 },
})
