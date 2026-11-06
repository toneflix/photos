import { useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, surfaces } from '@/theme'
import { OptionSheet, type Option } from './OptionSheet'
import { Text } from './Text'

/** A form control that opens an option sheet, like a native select. */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((option) => option.value === value)

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ''}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.box, pressed && styles.pressed, disabled && styles.disabled]}
      >
        <Text style={styles.value} numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.ink500} />
      </Pressable>
      <OptionSheet visible={open} title={label} options={options} value={value} onSelect={onChange} onClose={() => setOpen(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  box: {
    minHeight: 48,
    paddingHorizontal: 14,
    ...surfaces.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: { borderColor: colors.ink500 },
  disabled: { opacity: 0.5 },
  value: { flex: 1 },
})
