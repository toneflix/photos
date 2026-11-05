import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { colors, fonts, radius } from '@/theme'
import { Text } from './Text'

type Variant = 'primary' | 'brand' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'glass'

const variants: Record<Variant, { box: ViewStyle; pressed: ViewStyle; text: string }> = {
  primary: { box: { backgroundColor: colors.gold400 }, pressed: { backgroundColor: colors.gold300 }, text: colors.ink900 },
  brand: { box: { backgroundColor: colors.brand700 }, pressed: { backgroundColor: colors.brand800 }, text: colors.white },
  dark: { box: { backgroundColor: colors.ink900 }, pressed: { backgroundColor: colors.ink700 }, text: colors.white },
  secondary: {
    box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.surface300 },
    pressed: { borderColor: colors.ink500 },
    text: colors.ink900,
  },
  ghost: { box: {}, pressed: { backgroundColor: colors.surface100 }, text: colors.ink700 },
  danger: {
    box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.red200 },
    pressed: { backgroundColor: colors.red50 },
    text: colors.red700,
  },
  glass: {
    box: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    pressed: { backgroundColor: 'rgba(255,255,255,0.22)' },
    text: colors.white,
  },
}

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string
  variant?: Variant
  loading?: boolean
  size?: 'md' | 'lg'
  style?: StyleProp<ViewStyle>
}

/** The app's button. Primary is Toneflix gold with ink text, as on the web. */
export function Button({ title, variant = 'primary', loading = false, size = 'md', disabled, style, ...props }: ButtonProps) {
  const look = variants[variant]
  const inactive = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      {...props}
      style={({ pressed }) => [styles.base, size === 'lg' && styles.large, look.box, pressed && look.pressed, inactive && styles.inactive, style]}
    >
      {loading && <ActivityIndicator size="small" color={look.text} />}
      <Text style={[styles.label, size === 'lg' && styles.largeLabel, { color: look.text }]}>{title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  large: { minHeight: 52, paddingHorizontal: 22 },
  inactive: { opacity: 0.5 },
  label: { fontFamily: fonts.semibold, fontSize: 14 },
  largeLabel: { fontSize: 16 },
})
