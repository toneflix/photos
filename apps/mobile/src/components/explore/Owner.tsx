import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Owner as OwnerData } from '@photos/types'
import { Avatar } from '@/components/Avatar'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'

/**
 * Who shared a photo, book or space, opening their profile. Owners who keep their name off shared work show as a member.
 * `plain` keeps it from opening anything where it sits inside another button.
 */
export function Owner({ owner, light = false, plain = false }: { owner: OwnerData; light?: boolean; plain?: boolean }) {
  const content = (
    <>
      {owner.name ? (
        <Avatar user={{ name: owner.name, avatarUrl: owner.avatarUrl }} size={24} />
      ) : (
        <View style={styles.anon}>
          <Ionicons name="person" size={13} color={colors.ink500} />
        </View>
      )}
      <Text numberOfLines={1} style={[styles.name, light && styles.light]}>
        {owner.name ?? 'A Toneflix member'}
      </Text>
    </>
  )

  if (plain || !owner.id) return <View style={styles.row}>{content}</View>

  const id = owner.id

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${owner.name}'s profile`}
      onPress={() => router.push({ pathname: '/makers/[id]', params: { id } })}
      hitSlop={6}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  anon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface300, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.medium, fontSize: 13, flexShrink: 1 },
  light: { color: colors.white },
})
