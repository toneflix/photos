import { useRef, useState, type ComponentRef } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { colors, fonts, surfaces } from '@/theme'
import { Text } from './Text'

/**
 * A one-time code as a row of digit boxes. One hidden text field takes the typing,
 * so paste and the keyboard's code autofill fill every box at once.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid = false,
  autoFocus = false,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  invalid?: boolean
  autoFocus?: boolean
  disabled?: boolean
}) {
  const input = useRef<ComponentRef<typeof TextInput>>(null)
  const [focused, setFocused] = useState(autoFocus)
  const active = Math.min(value.length, length - 1)

  const change = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length)

    onChange(digits)
    if (digits.length === length && digits !== value) onComplete?.(digits)
  }

  return (
    <Pressable accessible={false} onPress={() => input.current?.focus()} style={styles.row}>
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={[styles.box, focused && i === active && styles.boxActive, invalid && styles.boxInvalid, i === length / 2 && styles.gap]}
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.digit}>{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={input}
        value={value}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        accessibilityLabel={`${length}-digit code`}
        style={styles.hidden}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: {
    flex: 1,
    maxWidth: 52,
    aspectRatio: 0.85,
    ...surfaces.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: surfaces.fieldFocused,
  boxInvalid: { borderColor: colors.red600 },
  gap: { marginLeft: 8 },
  digit: { fontFamily: fonts.semibold, fontSize: 24, fontVariant: ['tabular-nums'] },
  hidden: { position: 'absolute', inset: 0, opacity: 0.01, color: 'transparent' },
})
