import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'

/** Underlined tabs inside a screen, like the web's Photos / Books / Spaces tabs. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value

        return (
          <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(option.value)} style={[styles.tab, active && styles.active]}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 24, borderBottomWidth: 1.5, borderBottomColor: colors.surface200 },
  tab: { paddingBottom: 10, marginBottom: -1.5, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  active: { borderBottomColor: colors.brand600 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink500 },
  labelActive: { color: colors.brand700 },
})
