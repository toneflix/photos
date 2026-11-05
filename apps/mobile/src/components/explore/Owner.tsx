import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Owner as OwnerData } from '@photos/types'
import { Avatar } from '@/components/Avatar'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'

/** Who shared a photo, book or space. Owners who keep their name off shared work show as a member. */
export function Owner({ owner, light = false }: { owner: OwnerData; light?: boolean }) {
  return (
    <View style={styles.row}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  anon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface300, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.medium, fontSize: 13, flexShrink: 1 },
  light: { color: colors.white },
})
