import { useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native'
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg'
import type { StatsDay } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'

/** The same series colours as the web charts. */
const SERIES = [
  { key: 'views', label: 'Views', color: '#0064d6' },
  { key: 'downloads', label: 'Downloads', color: '#bb8c01' },
] as const

const HEIGHT = 180
const PAD = { top: 8, right: 8, bottom: 22, left: 32 }

const number = new Intl.NumberFormat('en')
const shortDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** A rounded axis top for `max`. */
function axisTop(max: number): number {
  if (max <= 4) return Math.max(max, 1)

  const step = 10 ** Math.floor(Math.log10(max / 4))
  const nice = [1, 2, 5, 10].map((factor) => factor * step).find((size) => max / size <= 4) ?? step * 10

  return Math.ceil(max / nice) * nice
}

/** Views and downloads per day as two lines, with each series' total in the legend. Spaces pass `downloads={false}`. */
export function StatsChart({ days, downloads = true }: { days: StatsDay[]; downloads?: boolean }) {
  const [width, setWidth] = useState(0)
  const series = downloads ? SERIES : SERIES.slice(0, 1)
  const top = axisTop(Math.max(0, ...days.flatMap((day) => series.map((line) => day[line.key]))))
  const innerWidth = Math.max(1, width - PAD.left - PAD.right)
  const innerHeight = HEIGHT - PAD.top - PAD.bottom
  const x = (index: number) => PAD.left + (days.length > 1 ? (index / (days.length - 1)) * innerWidth : innerWidth / 2)
  const y = (value: number) => PAD.top + innerHeight - (value / top) * innerHeight

  const measure = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))

  return (
    <View style={styles.box}>
      <View style={styles.legend}>
        {series.map((line) => (
          <View key={line.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: line.color }]} />
            <Text variant="small">{line.label}</Text>
            <Text style={styles.total}>{number.format(days.reduce((sum, day) => sum + day[line.key], 0))}</Text>
          </View>
        ))}
      </View>
      <View onLayout={measure} accessible accessibilityLabel={series.map((line) => `${line.label}: ${days.reduce((sum, day) => sum + day[line.key], 0)}`).join(', ')}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {[0, top / 2, top].map((tick) => (
              <Line key={tick} x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={colors.surface200} strokeWidth={1} />
            ))}
            {[0, top / 2, top].map((tick) => (
              <SvgText key={`label-${tick}`} x={PAD.left - 6} y={y(tick) + 4} fontSize={10} fontFamily={fonts.body} fill={colors.ink500} textAnchor="end">
                {number.format(tick)}
              </SvgText>
            ))}
            {days.length > 0 && (
              <>
                <SvgText x={PAD.left} y={HEIGHT - 6} fontSize={10} fontFamily={fonts.body} fill={colors.ink500}>
                  {shortDate(days[0].date)}
                </SvgText>
                <SvgText x={width - PAD.right} y={HEIGHT - 6} fontSize={10} fontFamily={fonts.body} fill={colors.ink500} textAnchor="end">
                  {shortDate(days[days.length - 1].date)}
                </SvgText>
              </>
            )}
            {series.map((line) => (
              <Polyline
                key={line.key}
                points={days.map((day, index) => `${x(index)},${y(day[line.key])}`).join(' ')}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 3, borderRadius: 2 },
  total: { fontFamily: fonts.semibold, color: colors.ink900 },
})
