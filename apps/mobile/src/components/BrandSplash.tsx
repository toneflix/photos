import { useEffect, useRef, useState } from 'react'
import { Animated, Image, StyleSheet } from 'react-native'
import { SplashScreen } from 'expo-router'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

/** Gold glow behind the splash logo, the same stops as the generated icons and share image. */
const GLOW = [
  { offset: 0, color: '#f6c400' },
  { offset: 0.38, color: '#ebb800' },
  { offset: 0.78, color: '#c99700' },
  { offset: 1, color: '#bb8c01' },
]

/**
 * The launch screen drawn in the app. It takes over from the flat gold native splash with the
 * logo and wordmark at the same size and place, fades the gold glow in, and fades away when
 * `done` turns true.
 */
export function BrandSplash({ done }: { done: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current
  const glow = useRef(new Animated.Value(0)).current
  const [gone, setGone] = useState(false)

  useEffect(() => {
    Animated.timing(glow, { toValue: 1, duration: 400, useNativeDriver: true }).start()
  }, [glow])

  useEffect(() => {
    if (!done) return

    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setGone(true))
  }, [done, opacity])

  if (gone) return null

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.screen, { opacity }]}
      onLayout={() => SplashScreen.hideAsync()}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="70.7%">
              {GLOW.map((stop) => (
                <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
              ))}
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      </Animated.View>
      <Image source={require('../../assets/splash-icon.png')} style={styles.mark} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    // The native splash's background colour in app.json.
    backgroundColor: '#eebb00',
  },
  // Matches `imageWidth` of the expo-splash-screen plugin in app.json.
  mark: { width: 260, height: 260 },
})
