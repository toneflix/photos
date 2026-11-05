import Svg, { Rect } from 'react-native-svg'
import type { PageLayout } from '@photos/types'

const RECTS: Record<PageLayout, [number, number, number, number][]> = {
  single: [[0, 0, 12, 16]],
  framed: [[2, 2, 8, 9]],
  pair: [
    [2, 2, 8, 5.5],
    [2, 8.5, 8, 5.5],
  ],
  grid: [
    [1.5, 1.5, 4, 6],
    [6.5, 1.5, 4, 6],
    [1.5, 8.5, 4, 6],
    [6.5, 8.5, 4, 6],
  ],
  collage: [
    [1.5, 1.5, 9, 7],
    [1.5, 9.5, 4, 5],
    [6.5, 9.5, 4, 5],
  ],
  text: [
    [3, 5, 6, 1],
    [2, 7.5, 8, 1],
    [3, 10, 6, 1],
  ],
}

/** A tiny page showing where a layout puts its photos. */
export function LayoutIcon({ layout, color }: { layout: PageLayout; color: string }) {
  return (
    <Svg viewBox="0 0 12 16" width={12} height={16}>
      <Rect x={0.5} y={0.5} width={11} height={15} fill="none" stroke={color} strokeOpacity={0.5} />
      {RECTS[layout].map(([x, y, width, height], i) => (
        <Rect key={i} x={x} y={y} width={width} height={height} fill={color} />
      ))}
    </Svg>
  )
}
