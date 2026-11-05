import { Text as NativeText, type TextProps, StyleSheet } from 'react-native'
import { colors, fonts } from '@/theme'

type Variant = 'body' | 'muted' | 'small' | 'label' | 'title' | 'display' | 'link'

/** Text in the app's type scale: Inter for reading, Plus Jakarta Sans for headings. */
export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <NativeText {...props} style={[styles.base, styles[variant], style]} />
}

const styles = StyleSheet.create({
  base: { fontFamily: fonts.body, color: colors.ink900 },
  body: { fontSize: 16, lineHeight: 24 },
  muted: { fontSize: 14, lineHeight: 20, color: colors.ink500 },
  small: { fontSize: 12, lineHeight: 16, color: colors.ink500 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold },
  title: { fontSize: 20, lineHeight: 26, fontFamily: fonts.display, letterSpacing: -0.3 },
  display: { fontSize: 30, lineHeight: 36, fontFamily: fonts.display, letterSpacing: -0.6 },
  link: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold, color: colors.brand700 },
})
