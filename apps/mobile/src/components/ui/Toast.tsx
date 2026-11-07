import { Fragment, useEffect, useRef } from 'react'
import { Animated, Platform, Pressable, StyleSheet } from 'react-native'
import { FullWindowOverlay } from 'react-native-screens'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { toast, useToast } from '@/lib/toast'
import { colors, fonts, radius } from '@/theme'
import { Text } from './Text'

// iOS shows modal screens in their own window, so the toast needs one above them.
const Overlay = Platform.OS === 'ios' ? FullWindowOverlay : Fragment

/** Shows the current toast above the bottom edge. Tap to dismiss. Mounted once in the root layout. */
export function ToastHost() {
  const message = useToast()
  const insets = useSafeAreaInsets()
  const shown = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!message) return

    shown.setValue(0)
    Animated.timing(shown, { toValue: 1, duration: 180, useNativeDriver: true }).start()
  }, [message, shown])

  if (!message) return null

  const lift = shown.interpolate({ inputRange: [0, 1], outputRange: [12, 0] })

  return (
    <Overlay>
      <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 16, opacity: shown, transform: [{ translateY: lift }] }]}>
        <Pressable
          accessibilityRole={message.tone === 'error' ? 'alert' : 'summary'}
          accessibilityLiveRegion="polite"
          onPress={() => toast.hide()}
          style={[styles.toast, message.tone === 'error' && styles.error]}
        >
          <Text style={styles.text}>{message.text}</Text>
        </Pressable>
      </Animated.View>
    </Overlay>
  )
}

/** The toast for a Modal's content on Android and web, where the Modal covers the root toast. */
export function ModalToastHost() {
  return Platform.OS === 'ios' ? null : <ToastHost />
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { maxWidth: 480, borderRadius: radius.field, backgroundColor: colors.ink900, paddingHorizontal: 16, paddingVertical: 12 },
  error: { backgroundColor: colors.red700 },
  text: { color: colors.white, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
})
