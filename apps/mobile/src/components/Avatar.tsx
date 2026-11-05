import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import type { User } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'

/** The user's photo, or their initials on Toneflix blue. */
export function Avatar({ user, size = 36 }: { user: Pick<User, 'name' | 'avatarUrl'>; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 }

  if (user.avatarUrl) return <Image source={{ uri: user.avatarUrl }} style={[box, styles.photo]} accessibilityLabel={user.name} />

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <View style={[box, styles.initials]} accessibilityLabel={user.name}>
      <Text style={[styles.letters, { fontSize: size * 0.38 }]}>{initials || '?'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.surface200 },
  initials: { backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
  letters: { color: colors.white, fontFamily: fonts.semibold },
})
