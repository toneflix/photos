import { createContext, useCallback, useContext, useMemo, useState, type ComponentRef, type ReactNode } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { BlurTargetView, BlurView } from 'expo-blur'
import { BottomTabBar, BottomTabBarHeightContext, type BottomTabBarProps } from 'expo-router/tabs'

type Target = ComponentRef<typeof View>

type Targets = {
  nodes: Record<string, Target | null>
  attach: (key: string, node: Target | null) => void
}

const GlassTargets = createContext<Targets>({ nodes: {}, attach: () => {} })
const FocusedScene = createContext<string | null>(null)

/** Holds each tab scene's view so the tab bar can blur the one on screen (Android blurs a target view). */
export function GlassTabs({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Targets['nodes']>({})

  const attach = useCallback((key: string, node: Target | null) => {
    setNodes((current) => (current[key] === node ? current : { ...current, [key]: node }))
  }, [])

  const targets = useMemo(() => ({ nodes, attach }), [nodes, attach])

  return <GlassTargets.Provider value={targets}>{children}</GlassTargets.Provider>
}

/** A tab scene the glass tab bar blurs as it scrolls behind it. */
export function GlassScene({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const { attach } = useContext(GlassTargets)
  const ref = useCallback((node: Target | null) => attach(routeKey, node), [attach, routeKey])

  return (
    <BlurTargetView ref={ref} collapsable={false} style={styles.scene}>
      {children}
    </BlurTargetView>
  )
}

/** The bottom tabs, telling the glass background which scene is on screen. */
export function GlassTabBar(props: BottomTabBarProps) {
  const focused = props.state.routes[props.state.index]?.key ?? null

  return (
    <FocusedScene.Provider value={focused}>
      <BottomTabBar {...props} />
    </FocusedScene.Provider>
  )
}

/** The tab bar background: frosted glass over the scene on screen. */
export function GlassBackground() {
  const { nodes } = useContext(GlassTargets)
  const focused = useContext(FocusedScene)
  const node = focused ? (nodes[focused] ?? null) : null
  const target = useMemo(() => ({ current: node }), [node])

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        tint="light"
        intensity={Platform.OS === 'android' ? 80 : 60}
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={target}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tint} />
    </View>
  )
}

/** Room to leave under scrolling content so its end clears the glass tab bar; 0 outside the tabs. */
export function useTabBarInset() {
  return useContext(BottomTabBarHeightContext) ?? 0
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.45)' },
})

/** Tab bar styles for the glass look: it floats over the scenes, so content scrolls behind it. */
export const glassTabBarStyle = {
  position: 'absolute',
  backgroundColor: 'transparent',
  borderTopWidth: 1.5,
  borderTopColor: 'rgba(185,198,216,0.45)',
  elevation: 0,
} as const
