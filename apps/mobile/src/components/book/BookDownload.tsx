import { useRef, useState, type ReactNode } from 'react'
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BookWithPages } from '@photos/types'
import { Sheet } from '@/components/access/Sheet'
import { Button, Callout, Text } from '@/components/ui'
import { ApiDownload } from '@/lib/download'
import { webUrl } from '@/lib/links'
import { printBook } from '@/lib/print'
import { colors, fonts, radius } from '@/theme'

/**
 * The book's Download chip. With the zip available its main part opens it and its arrow lists every
 * download; without it the whole chip opens the list. Shown when there is anything to list.
 */
export function DownloadChip({ book, onZip, onOptions }: { book: BookWithPages; onZip: () => void; onOptions: () => void }) {
  const options = book.pageDownloads.pdf || book.pageDownloads.images || book.pageDownloads.print || book.isOwner

  if (!book.canDownload && !options) return null
  if (!options) return <Part title="Download" onPress={onZip} />

  return (
    <View style={styles.split}>
      {book.canDownload && <Part title="Download" onPress={onZip} style={styles.left} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Download options"
        onPress={onOptions}
        style={({ pressed }) => [styles.chip, book.canDownload && styles.right, pressed && styles.pressed]}
      >
        {!book.canDownload && <Text style={styles.text}>Download</Text>}
        <Ionicons name="chevron-down" size={16} color={colors.white} />
      </Pressable>
    </View>
  )
}

function Part({ title, onPress, style }: { title: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, style, pressed && styles.pressed]}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  )
}

type Kind = 'zip' | 'pdf' | 'images' | 'print'

const PAGE_FORMATS = [
  { format: 'pdf', title: 'Pages as a PDF', detail: 'Every page as designed, ready to print', button: 'PDF' },
  { format: 'images', title: 'Pages as images', detail: 'Each page as a PNG in a zip', button: 'Zip' },
] as const

/** Every download the visitor has for a book: the photos as a zip and, for owners, the pages as a PDF or images. */
export function DownloadOptions({ book, code, onClose }: { book: BookWithPages; code: string | null; onClose: () => void }) {
  const [busy, setBusy] = useState<Kind | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const running = useRef(false)

  const run = async (kind: Kind) => {
    if (running.current) return

    running.current = true
    setBusy(kind)
    setProblem(null)

    try {
      if (kind === 'zip') await ApiDownload.book(book.id, code).share(`Save “${book.title}”`)
      else if (kind === 'print') await printBook(book.id)
      else await ApiDownload.bookPages(book.id, kind).share(`Save the pages of “${book.title}”`, kind === 'pdf' ? ApiDownload.PDF : ApiDownload.ZIP)
      onClose()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "We couldn't download it.")
    } finally {
      running.current = false
      setBusy(null)
    }
  }

  return (
    <Sheet title="Download" onClose={onClose}>
      {problem ? <Callout>{problem}</Callout> : null}
      {book.canDownload && (
        <Option title="Photos" detail={book.permissions.includes('transfer') ? 'Every original photo, as a zip' : 'Openly licensed photos, as a zip'}>
          <Button title="Zip" variant="secondary" loading={busy === 'zip'} disabled={!!busy} onPress={() => run('zip')} />
        </Option>
      )}
      {PAGE_FORMATS.map(({ format, title, detail, button }) =>
        book.pageDownloads[format] ? (
          <Option key={format} title={title} detail={busy === format ? 'Preparing your file. This can take a minute.' : detail}>
            <Button title={button} variant="secondary" loading={busy === format} disabled={!!busy} onPress={() => run(format)} />
          </Option>
        ) : (
          book.isOwner && (
            <Option key={format} title={title} detail={`${detail}, with Premium`}>
              <Button title="See Premium" onPress={() => Linking.openURL(webUrl('/pricing')).catch(() => undefined)} />
            </Option>
          )
        ),
      )}
      {book.pageDownloads.print ? (
        <Option title="Print" detail={busy === 'print' ? 'Getting your book ready to print…' : 'Every page as designed, from your printer'}>
          <Button title="Print" variant="secondary" loading={busy === 'print'} disabled={!!busy} onPress={() => run('print')} />
        </Option>
      ) : (
        book.isOwner && (
          <Option title="Print" detail="Every page as designed, from your printer, with Premium">
            <Button title="See Premium" onPress={() => Linking.openURL(webUrl('/pricing')).catch(() => undefined)} />
          </Option>
        )
      )}
    </Sheet>
  )
}

function Option({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <View style={styles.option}>
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        <Text variant="muted">{detail}</Text>
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  left: { borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingRight: 12 },
  right: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  pressed: { backgroundColor: 'rgba(255,255,255,0.2)' },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, color: colors.ink900 },
})
