import { useEffect, useRef, useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Rect } from 'react-native-svg'
import { LAYOUT_SKETCHES, PAGE_LAYOUTS, type PageLayout, type SketchBox } from '@photos/types'
import { Text } from '@/components/ui'
import { webUrl } from '@/lib/links'
import { colors, fonts, radius } from '@/theme'

const LAYOUTS = Object.keys(PAGE_LAYOUTS) as PageLayout[]
const ITEM = 84

/** A small page drawing showing where a layout puts its photos and writing. */
export function LayoutSketch({ layout, color }: { layout: PageLayout; color: string }) {
  const { photos, lines } = LAYOUT_SKETCHES[layout]
  const box = ([x, y, width, height, turn]: SketchBox, i: number, opacity: number) => (
    <Rect
      key={i}
      x={x}
      y={y}
      width={width}
      height={height}
      rx={0.25}
      fill={color}
      fillOpacity={opacity}
      transform={turn ? `rotate(${turn} ${x + width / 2} ${y + height / 2})` : undefined}
    />
  )

  return (
    <Svg viewBox="0 0 12 16" width="100%" height="100%">
      {photos.map((photo, i) => box(photo, i, 1))}
      {lines.map((line, i) => box(line, i, 0.45))}
    </Svg>
  )
}

/** One row of page layouts that scrolls sideways, keeping the chosen one in view. Layouts outside `allowed` carry a Premium mark. */
export function LayoutPicker({ value, allowed, onPick }: { value: PageLayout; allowed?: PageLayout[]; onPick: (layout: PageLayout) => void }) {
  const row = useRef<ScrollViewInstance>(null)
  const [width, setWidth] = useState(0)
  const [asked, setAsked] = useState<PageLayout | null>(null)

  useEffect(() => {
    if (!width) return

    const left = LAYOUTS.indexOf(value) * ITEM - (width - ITEM) / 2

    row.current?.scrollTo({ x: Math.max(0, left), animated: true })
    setAsked(null)
  }, [value, width])

  return (
    <View style={styles.panel} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={row}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel="Page layout"
      >
        {LAYOUTS.map((layout) => {
          const on = value === layout
          const premium = !!allowed && !allowed.includes(layout)

          return (
            <Pressable
              key={layout}
              onPress={() => {
                setAsked(premium ? layout : null)

                if (!premium) onPick(layout)
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: premium }}
              accessibilityLabel={premium ? `${PAGE_LAYOUTS[layout].label}, Premium` : PAGE_LAYOUTS[layout].label}
              style={styles.item}
            >
              <View>
                <View style={[styles.page, premium && styles.pagePremium, on && styles.pageOn]}>
                  <View style={premium && styles.sketchPremium}>
                    <LayoutSketch layout={layout} color={on ? colors.brand600 : premium ? colors.gold600 : colors.ink500} />
                  </View>
                </View>
                {premium && (
                  <View style={styles.mark}>
                    <Ionicons name="star" size={9} color={colors.ink900} />
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={[styles.label, on && styles.labelOn]}>
                {PAGE_LAYOUTS[layout].label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {asked && (
        <Text style={styles.hint}>
          {PAGE_LAYOUTS[asked].label} pages come with Premium.{' '}
          <Text style={styles.hintLink} onPress={() => Linking.openURL(webUrl('/pricing')).catch(() => undefined)}>
            See plans
          </Text>
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, backgroundColor: colors.white, overflow: 'hidden' },
  row: { paddingHorizontal: 6, paddingVertical: 10 },
  item: { width: ITEM, alignItems: 'center', gap: 6 },
  page: { width: 40, height: 53, borderRadius: 5, borderWidth: 2, borderColor: colors.surface200, backgroundColor: colors.surface100, overflow: 'hidden' },
  pagePremium: { borderColor: colors.gold200, backgroundColor: colors.gold50 },
  sketchPremium: { flex: 1, opacity: 0.45 },
  mark: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold400,
  },
  pageOn: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  label: { fontSize: 11, color: colors.ink500 },
  labelOn: { color: colors.brand700, fontFamily: fonts.semibold },
  hint: { borderTopWidth: 1.5, borderTopColor: colors.surface200, paddingHorizontal: 16, paddingVertical: 8, textAlign: 'center', fontSize: 12, color: colors.ink700 },
  hintLink: { fontSize: 12, fontFamily: fonts.semibold, color: colors.brand700 },
})
