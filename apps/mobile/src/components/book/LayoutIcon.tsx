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
  triptych: [
    [1, 2.5, 3, 10],
    [4.5, 2.5, 3, 10],
    [8, 2.5, 3, 10],
  ],
  mosaic: [
    [1, 1, 6, 12.5],
    [7.5, 1, 3.5, 6],
    [7.5, 7.5, 3.5, 6],
  ],
  strip: [
    [1, 1, 10, 4],
    [1, 5.5, 10, 4],
    [1, 10, 10, 4],
  ],
  contact: [
    [1, 1, 4.75, 4],
    [6.25, 1, 4.75, 4],
    [1, 5.5, 4.75, 4],
    [6.25, 5.5, 4.75, 4],
    [1, 10, 4.75, 4],
    [6.25, 10, 4.75, 4],
  ],
  scatter: [
    [1.5, 1.5, 6, 4.5],
    [4.5, 6, 6, 4.5],
    [1.5, 10.5, 5.5, 4],
  ],
  story: [
    [1, 1, 10, 8],
    [1.5, 10.5, 9, 1],
    [1.5, 12.5, 7, 1],
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
