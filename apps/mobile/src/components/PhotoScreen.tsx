import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Photo } from '@photos/types'
import { colors } from '@/theme'

type PhotoScreenProps = {
  photo: Pick<Photo, 'url' | 'width' | 'height' | 'caption'>
  /** The button that leaves the screen: a back chevron on the left, or a close cross on the right. */
  leave: 'back' | 'close'
  children: ReactNode
}

/** A photo held still above its details, or beside them in landscape, while only the details scroll. */
export function PhotoScreen({ photo, leave, children }: PhotoScreenProps) {
  const window = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const wide = window.width > window.height
  const ratio = photo.width && photo.height ? photo.width / photo.height : 4 / 3
  const stageWidth = wide ? Math.round(window.width * 0.58) : window.width
  const imageHeight = wide ? window.height - insets.top - insets.bottom : Math.min(window.width / ratio, window.height * 0.45)
  const imageWidth = wide ? stageWidth - insets.left : window.width

  return (
    <View style={[styles.page, wide && styles.row]}>
      <View style={[styles.stage, { width: stageWidth, paddingTop: insets.top, paddingLeft: wide ? insets.left : 0, paddingBottom: wide ? insets.bottom : 0 }]}>
        <Image source={{ uri: photo.url }} style={{ width: imageWidth, height: imageHeight }} contentFit="contain" accessibilityLabel={photo.caption ?? 'Photo'} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={leave === 'back' ? 'Back' : 'Close'}
          onPress={() => router.back()}
          style={[styles.leave, { top: insets.top + 12 }, leave === 'back' ? { left: 12 + (wide ? insets.left : 0) } : { right: 12 }]}
        >
          <Ionicons name={leave === 'back' ? 'chevron-back' : 'close'} size={22} color={colors.white} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.details}
        contentContainerStyle={{ paddingTop: wide ? insets.top : 0, paddingRight: wide ? insets.right : 0, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  row: { flexDirection: 'row' },
  stage: { backgroundColor: colors.ink900, alignItems: 'center', justifyContent: 'center' },
  leave: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1 },
})
