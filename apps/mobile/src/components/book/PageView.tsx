import { useContext, type ReactNode } from 'react'
import { Image, Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import type { BookPage, Photo } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'
import { BookLookContext, ink, usePaper, type PaperLook } from './paper'
import { PrintedPhoto } from './PrintedPhoto'

/** Pages are 3:4, like the web's. */
export const PAGE_RATIO = 3 / 4

type PageContent = Pick<BookPage, 'layout' | 'caption' | 'photos'> & Partial<Pick<BookPage, 'frame'>>

/**
 * The inside of one book page, `width` wide. Sizes are in `unit`s of 1% of the width, so the same page
 * looks right as a thumbnail and full screen. In the editor, `onSlotPress` makes each photo slot pressable.
 */
export function PageView({
  page,
  width,
  number,
  side,
  showImages = true,
  onSlotPress,
  activeSlot,
}: {
  page: PageContent
  width: number
  number?: number
  side?: 'left' | 'right'
  showImages?: boolean
  onSlotPress?: (slot: number) => void
  activeSlot?: number | null
}) {
  const look = usePaper()
  const bookFrame = useContext(BookLookContext).frame
  const unit = width / 100
  const { layout, caption, photos } = page
  const frame = layout === 'single' ? 'none' : (page.frame ?? bookFrame)
  const captionStyle = { fontSize: 3.8 * unit, lineHeight: 5.2 * unit, color: ink(look) }

  const slot = (index: number, style: ViewStyle, fit: 'cover' | 'contain' = 'cover') => {
    const photo: Photo | undefined = photos[index]
    const active = !!onSlotPress && activeSlot === index

    return (
      <Pressable
        key={index}
        disabled={!onSlotPress}
        onPress={() => onSlotPress?.(index)}
        accessibilityRole={onSlotPress ? 'button' : undefined}
        accessibilityLabel={onSlotPress ? `Photo slot ${index + 1}` : undefined}
        style={[style, fit === 'cover' && styles.clip]}
      >
        {photo ? (
          <PrintedPhoto photo={photo} frame={frame} unit={unit} fit={fit} show={showImages} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.empty, { backgroundColor: ink(look, 0.1) }, onSlotPress && { borderWidth: 0.4 * unit, borderColor: ink(look, 0.3) }]}>
            {onSlotPress && <Text style={{ fontSize: 3.2 * unit, color: ink(look, 0.7) }}>Add a photo</Text>}
          </View>
        )}
        {active && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 0.8 * unit, borderColor: colors.brand500 }]} />}
      </Pressable>
    )
  }

  const pageCaption = caption ? <Text style={[styles.caption, captionStyle]}>{caption}</Text> : null

  return (
    <Paper width={width} side={side}>
      {layout === 'single' && (
        <>
          {slot(0, StyleSheet.absoluteFill)}
          {caption ? (
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              style={[styles.overlay, { paddingTop: 14 * unit, paddingHorizontal: 7 * unit, paddingBottom: 7 * unit }]}
            >
              <Text style={[styles.caption, { fontSize: 4.2 * unit, lineHeight: 5.7 * unit, color: colors.white, textAlign: 'left' }]}>{caption}</Text>
            </LinearGradient>
          ) : null}
        </>
      )}

      {layout === 'framed' && (
        <View style={[styles.fill, { paddingTop: 10 * unit, paddingHorizontal: 9 * unit, paddingBottom: 6 * unit }]}>
          {slot(0, styles.flex, 'contain')}
          <Text style={[styles.caption, captionStyle, { marginTop: 5 * unit, minHeight: 6 * unit, fontSize: 4.2 * unit, lineHeight: 5.7 * unit }]}>{caption}</Text>
        </View>
      )}

      {layout === 'pair' && (
        <View style={[styles.fill, { padding: 7 * unit, gap: 4 * unit }]}>
          {slot(0, styles.flex)}
          {slot(1, styles.flex)}
          {pageCaption}
        </View>
      )}

      {layout === 'grid' && (
        <View style={[styles.fill, { padding: 7 * unit, gap: 3 * unit }]}>
          {[0, 2].map((first) => (
            <View key={first} style={[styles.row, { gap: 3 * unit }]}>
              {slot(first, styles.flex)}
              {slot(first + 1, styles.flex)}
            </View>
          ))}
          {pageCaption}
        </View>
      )}

      {layout === 'collage' && (
        <View style={[styles.fill, { padding: 7 * unit, gap: 3 * unit }]}>
          {slot(0, { flex: 1.4 })}
          <View style={[styles.row, { gap: 3 * unit }]}>
            {slot(1, styles.flex)}
            {slot(2, styles.flex)}
          </View>
          {pageCaption}
        </View>
      )}

      {layout === 'text' && (
        <View style={[styles.fill, styles.centered, { paddingVertical: 14 * unit, paddingHorizontal: 12 * unit }]}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 18 * unit, lineHeight: 16 * unit, height: 10 * unit, color: ink(look, 0.3) }} accessible={false}>
            “
          </Text>
          <Text style={[styles.caption, { marginTop: 4 * unit, fontSize: 6 * unit, lineHeight: 8.4 * unit, color: ink(look) }]}>
            {caption || (onSlotPress ? 'Write something in the caption box below.' : '')}
          </Text>
        </View>
      )}

      {number !== undefined && layout !== 'single' && (
        <Text
          style={[styles.number, side === 'left' ? styles.left : styles.right, { paddingHorizontal: 5 * unit, paddingBottom: 2.6 * unit, fontSize: 2.8 * unit, color: ink(look, 0.6) }]}
        >
          {number}
        </Text>
      )}
    </Paper>
  )
}

/** A sheet of the book's paper with its texture under the content and grain and page light over it. */
export function Paper({ width, side, children }: { width: number; side?: 'left' | 'right'; children?: ReactNode }) {
  const look = usePaper()

  return (
    <View style={[styles.page, { width, height: width / PAGE_RATIO, backgroundColor: look.background }]}>
      <Image source={look.texture} resizeMode="repeat" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: look.textureOpacity }]} />
      <PageLight look={look} />
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={look.grain} resizeMode="repeat" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: look.grainOpacity }]} />
        {side && <Gutter side={side} />}
      </View>
    </View>
  )
}

/** Soft light from the top left and darker edges, like a real sheet. */
function PageLight({ look }: { look: PaperLook }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <RadialGradient id="light" cx="30%" cy="20%" rx="55%" ry="55%">
          <Stop offset="0" stopColor={look.light} />
          <Stop offset="1" stopColor={look.light} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="vignette" cx="50%" cy="50%" rx="70%" ry="70%">
          <Stop offset="0.6" stopColor={look.vignette} stopOpacity={0} />
          <Stop offset="1" stopColor={look.vignette} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#light)" />
      <Rect width="100%" height="100%" fill="url(#vignette)" />
    </Svg>
  )
}

/** The page curving into the spine on a spread, and the sheen where it rises. */
function Gutter({ side }: { side: 'left' | 'right' }) {
  const toEdge = side === 'right' ? { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } } : { start: { x: 1, y: 0 }, end: { x: 0, y: 0 } }

  return (
    <>
      <LinearGradient
        {...toEdge}
        colors={['rgba(20,12,4,0.5)', 'rgba(20,12,4,0.3)', 'rgba(20,12,4,0.14)', 'rgba(20,12,4,0.05)', 'transparent', 'transparent', 'rgba(20,12,4,0.07)']}
        locations={[0, 0.015, 0.04, 0.08, 0.15, 0.94, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        {...toEdge}
        colors={['transparent', 'rgba(255,250,240,0.07)', 'rgba(255,250,240,0.02)', 'transparent']}
        locations={[0.06, 0.13, 0.26, 0.4]}
        style={StyleSheet.absoluteFill}
      />
    </>
  )
}

const styles = StyleSheet.create({
  page: { overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  flex: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
  empty: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  caption: { fontFamily: fonts.serifItalic, textAlign: 'center' },
  number: { position: 'absolute', bottom: 0, fontFamily: fonts.serif },
  left: { left: 0 },
  right: { right: 0 },
})
