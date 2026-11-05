import { useState, type ReactNode } from 'react'
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native'
import { colors, fonts, radius } from '@/theme'
import { Text } from './Text'

/** A labelled form control with its error or hint underneath. */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text variant="small">{hint}</Text> : null}
    </View>
  )
}

/** A text box that rings in Toneflix blue while focused. */
export function Input({ invalid, style, onFocus, onBlur, ...props }: TextInputProps & { invalid?: boolean }) {
  const [focused, setFocused] = useState(false)

  return (
    <TextInput
      placeholderTextColor={colors.ink500}
      {...props}
      onFocus={(event) => {
        setFocused(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        onBlur?.(event)
      }}
      style={[styles.input, focused && styles.focused, invalid && styles.invalid, style]}
    />
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface300,
    backgroundColor: colors.white,
    color: colors.ink900,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  focused: { borderColor: colors.brand500, boxShadow: '0 0 0 3px rgba(0,175,255,0.2)' },
  invalid: { borderColor: colors.red700 },
  error: { fontSize: 14, lineHeight: 20, color: colors.red700 },
})
