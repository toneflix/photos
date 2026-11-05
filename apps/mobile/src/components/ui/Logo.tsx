import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import { colors, fonts } from '@/theme'
import { Text } from './Text'

/** The Toneflix mark with the "Photos" wordmark. */
export function Logo({ light = false, size = 32 }: { light?: boolean; size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Toneflix Photos" style={styles.row}>
      <Image source={require('../../../assets/brand/toneflix-mark.png')} style={{ height: size, width: (size * 71) / 128 }} contentFit="contain" />
      <Text style={[styles.word, { fontSize: size * 0.6, color: light ? colors.white : colors.ink900 }]}>Photos</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { fontFamily: fonts.display, letterSpacing: -0.4 },
})
