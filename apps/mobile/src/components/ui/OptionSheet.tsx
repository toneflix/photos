import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, radius, surfaces } from '@/theme'
import { Text } from './Text'

export interface Option<T extends string = string> {
  value: T
  label: string
  description?: string
}

/** A bottom sheet listing options, with a tick beside the chosen one. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  options: Option<T>[]
  value: T
  onSelect: (value: T) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
        <ScrollView>
          {options.map((option) => {
            const chosen = option.value === value

            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                onPress={() => {
                  onSelect(option.value)
                  onClose()
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.copy}>
                  <Text style={chosen ? styles.chosen : undefined}>{option.label}</Text>
                  {option.description ? <Text variant="muted">{option.description}</Text> : null}
                </View>
                {chosen && <Ionicons name="checkmark" size={22} color={colors.brand700} />}
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: surfaces.backdrop },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.surface300, marginBottom: 12 },
  title: { paddingHorizontal: 20, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  pressed: { backgroundColor: colors.surface100 },
  copy: { flex: 1, gap: 2 },
  chosen: { fontFamily: fonts.semibold },
})
