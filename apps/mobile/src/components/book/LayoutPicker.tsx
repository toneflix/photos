import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import { LAYOUT_SKETCHES, PAGE_LAYOUTS, type PageLayout, type SketchBox } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

const LAYOUTS = Object.keys(PAGE_LAYOUTS) as PageLayout[]
const ITEM = 72

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

/** One row of page layouts that scrolls sideways, keeping the chosen one in view. */
export function LayoutPicker({ value, onPick }: { value: PageLayout; onPick: (layout: PageLayout) => void }) {
  const row = useRef<ScrollViewInstance>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!width) return

    const left = LAYOUTS.indexOf(value) * ITEM - (width - ITEM) / 2

    row.current?.scrollTo({ x: Math.max(0, left), animated: true })
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

          return (
            <Pressable
              key={layout}
              onPress={() => onPick(layout)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={PAGE_LAYOUTS[layout].label}
              style={styles.item}
            >
              <View style={[styles.page, on && styles.pageOn]}>
                <LayoutSketch layout={layout} color={on ? colors.brand600 : colors.ink500} />
              </View>
              <Text numberOfLines={1} style={[styles.label, on && styles.labelOn]}>
                {PAGE_LAYOUTS[layout].label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, backgroundColor: colors.white, overflow: 'hidden' },
  row: { paddingHorizontal: 6, paddingVertical: 10 },
  item: { width: ITEM, alignItems: 'center', gap: 6 },
  page: { width: 40, height: 53, borderRadius: 5, borderWidth: 2, borderColor: colors.surface200, backgroundColor: colors.surface100, overflow: 'hidden' },
  pageOn: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  label: { fontSize: 11, color: colors.ink500 },
  labelOn: { color: colors.brand700, fontFamily: fonts.semibold },
})
