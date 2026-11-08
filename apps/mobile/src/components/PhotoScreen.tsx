import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Photo } from '@photos/types'
import type { PhotoNeighbours, SwipeStep } from '@/lib/photo-sequence'
import { colors } from '@/theme'

const SWIPE_DISTANCE = 60
const SWIPE_SPEED = 0.5
const useNativeDriver = Platform.OS !== 'web'

type PhotoScreenProps = {
  photo: Pick<Photo, 'url' | 'width' | 'height' | 'caption'>
  /** The button that leaves the screen: a back chevron on the left, or a close cross on the right. */
  leave: 'back' | 'close'
  /** The photos beside this one in the list it was opened from. Swiping the photo moves to them. */
  neighbours?: PhotoNeighbours
  children: ReactNode
}

/**
 * A photo held still above its details, or beside them in landscape, while only the details scroll.
 * Swiping the photo left or right shows the next or previous one from its list.
 */
export function PhotoScreen({ photo, leave, neighbours, children }: PhotoScreenProps) {
  const window = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const wide = window.width > window.height
  const ratio = photo.width && photo.height ? photo.width / photo.height : 4 / 3
  const stageWidth = wide ? Math.round(window.width * 0.58) : window.width
  const imageHeight = wide ? window.height - insets.top - insets.bottom : Math.min(window.width / ratio, window.height * 0.45)
  const imageWidth = wide ? stageWidth - insets.left : window.width
  const swipe = useSwipe(neighbours, stageWidth)

  return (
    <View style={[styles.page, wide && styles.row]}>
      <View
        {...swipe.handlers}
        accessibilityActions={swipe.actions}
        onAccessibilityAction={({ nativeEvent }) => neighbours?.move(nativeEvent.actionName === 'next' ? 1 : -1)}
        style={[styles.stage, { width: stageWidth, paddingTop: insets.top, paddingLeft: wide ? insets.left : 0, paddingBottom: wide ? insets.bottom : 0 }]}
      >
        <Animated.View style={{ transform: [{ translateX: swipe.offset }] }}>
          <Image source={{ uri: photo.url }} style={{ width: imageWidth, height: imageHeight }} contentFit="contain" accessibilityLabel={photo.caption ?? 'Photo'} />
        </Animated.View>
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

/**
 * Drags the photo with a sideways swipe and moves to the photo on that side once the swipe is long
 * or quick enough. A photo that came in from a swipe slides in from the side it came from.
 */
function useSwipe(neighbours: PhotoNeighbours | undefined, width: number) {
  const offset = useRef(new Animated.Value((neighbours?.entered ?? 0) * width)).current
  const latest = useRef(neighbours)

  latest.current = neighbours

  useEffect(() => {
    Animated.timing(offset, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver }).start()
  }, [offset])

  useEffect(() => {
    const urls = [neighbours?.previous?.url, neighbours?.next?.url].filter((url): url is string => !!url)

    if (urls.length) Image.prefetch(urls)
  }, [neighbours?.previous?.url, neighbours?.next?.url])

  const handlers = useMemo(() => {
    const target = (step: SwipeStep) => (step === 1 ? latest.current?.next : latest.current?.previous)
    const settle = () => Animated.spring(offset, { toValue: 0, useNativeDriver }).start()

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => !!(latest.current?.previous || latest.current?.next) && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => offset.setValue(target(dx < 0 ? 1 : -1) ? dx : dx / 4),
      onPanResponderRelease: (_, { dx, vx }) => {
        const step: SwipeStep = dx < 0 ? 1 : -1

        if (!target(step) || (Math.abs(dx) < SWIPE_DISTANCE && Math.abs(vx) < SWIPE_SPEED)) return settle()

        Animated.timing(offset, { toValue: -step * width, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver }).start(() => latest.current?.move(step))
      },
      onPanResponderTerminate: settle,
    }).panHandlers
  }, [offset, width])

  const actions = [
    ...(neighbours?.previous ? [{ name: 'previous', label: 'Previous photo' }] : []),
    ...(neighbours?.next ? [{ name: 'next', label: 'Next photo' }] : []),
  ]

  return { offset, handlers, actions }
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  row: { flexDirection: 'row' },
  stage: { backgroundColor: colors.ink900, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
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
