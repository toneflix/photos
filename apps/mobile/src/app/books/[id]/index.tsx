import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { BookPermission, BookWithPages } from '@photos/types'
import { Flipbook } from '@toneflix/flipbook-native'
import { AuthFrame } from '@/components/AuthFrame'
import { ContentCounts } from '@/components/ContentCounts'
import { CodeForm } from '@/components/access/CodeForm'
import { Sheet } from '@/components/access/Sheet'
import { BOOK_FONTS } from '@/components/book/look'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { bookCodes, useBookCode } from '@/lib/book-codes'
import { ApiDownload } from '@/lib/download'
import { FlipbookModel } from '@/lib/flipbook'
import { FormProblem } from '@/lib/forms'
import { bookLists } from '@/lib/lists'
import { useSession } from '@/lib/session'
import { appLimits, megabytes } from '@/lib/limits'
import { uploadFile } from '@/lib/upload-file'
import { colors, fonts, radius } from '@/theme'

/** Narrower readers leave the top bar to the book's title. */
const COUNTS_MIN_WIDTH = 840

/**
 * A book as a flipbook that opens sideways, with what the visitor may do with it in its top bar.
 * Opens private books with a saved access code, or a `?code=` from a share link, at `?page=` if given.
 */
export default function BookScreen() {
  const { id, code: shared, page } = useLocalSearchParams<{ id: string; code?: string; page?: string }>()
  const saved = useBookCode(id)
  const [redeeming, setRedeeming] = useState(!!shared)
  const [shareError, setShareError] = useState<string | null>(null)

  // A share link: check the code, remember it, and take it out of the address.
  useEffect(() => {
    if (!shared) return

    api.accessCodes
      .redeem(shared)
      .send()
      .then(({ data: grant }) => bookCodes.remember(grant.book.id, grant.code))
      .catch(() => setShareError('That access code is not valid or has expired.'))
      .finally(() => {
        setRedeeming(false)
        router.setParams({ code: undefined })
      })
  }, [shared])

  if (saved === undefined || redeeming) return <View style={styles.center} />

  return <LoadBook key={saved ?? 'none'} id={id} code={saved} startPage={Number(page) || undefined} shareError={shareError} />
}

/** Shows what went wrong in the reader, with a way to try again or leave, instead of closing the app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.center}>
      <View style={styles.problem}>
        <Callout>{`This book couldn't open: ${error.message}`}</Callout>
        <View style={styles.row}>
          <Button title="Go back" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.flex} />
          <Button title="Try again" onPress={retry} style={styles.flex} />
        </View>
      </View>
    </View>
  )
}

function LoadBook({ id, code, startPage, shareError }: { id: string; code: string | null; startPage?: number; shareError: string | null }) {
  const { data, error, loading, send } = useRequest(() => api.books.get(id, code), { cacheFor: null })
  const book: BookWithPages | undefined = data?.data

  if (book) return <Book book={book} code={code} startPage={startPage} reload={() => send().catch(() => undefined)} />

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink500} />
      </View>
    )
  }

  const status = (error as { code?: number } | undefined)?.code
  const locked = status === 404 || status === 422 || status === 403

  if (!locked) {
    return (
      <View style={styles.center}>
        <Callout>{FormProblem.from(error).message ?? "We couldn't open this book."}</Callout>
      </View>
    )
  }

  return (
    <AuthFrame title="This book is locked" subtitle="It's private. Enter the access code its owner gave you to open it.">
      {shareError ? <Callout>{shareError}</Callout> : null}
      {code ? <Callout>The access code you used no longer opens this book.</Callout> : null}
      <CodeForm onOpened={(opened) => (opened === id ? undefined : router.replace({ pathname: '/books/[id]', params: { id: opened } }))} />
    </AuthFrame>
  )
}

function Book({ book, code, startPage, reload }: { book: BookWithPages; code: string | null; startPage?: number; reload: () => void }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [panel, setPanel] = useState<'add' | 'claim' | 'download' | null>(null)
  const can = (permission: BookPermission) => book.permissions.includes(permission)
  const model = useMemo(() => FlipbookModel.book(book), [book])

  return (
    <View style={[styles.reader, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style="light" />
      <Flipbook
        book={model}
        startPage={startPage}
        fonts={BOOK_FONTS}
        topLeft={
          <View style={styles.topLeft}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8} style={styles.round}>
              <Ionicons name="chevron-back" size={20} color={colors.white} />
            </Pressable>
            {width >= COUNTS_MIN_WIDTH && <ContentCounts stats={book.stats} light />}
          </View>
        }
        topRight={
          <>
            {book.isOwner && <Chip title="Access codes" onPress={() => router.push({ pathname: '/books/[id]/access', params: { id: book.id } })} />}
            {book.isOwner && book.creatorId === book.userId && <Chip title="Stats" onPress={() => router.push({ pathname: '/stats/[kind]/[id]', params: { kind: 'books', id: book.id } })} />}
            {!book.isOwner && can('add') && <Chip title="Add photos" onPress={() => setPanel('add')} />}
            {!book.isOwner && can('transfer') && <Chip title="Make it yours" onPress={() => setPanel('claim')} />}
            {book.canDownload && <Chip title="Download" onPress={() => setPanel('download')} />}
            {book.canEdit && <Chip title="Edit" onPress={() => router.push({ pathname: '/books/[id]/edit', params: { id: book.id } })} />}
          </>
        }
      />

      {panel === 'add' && <AddPhotos book={book} code={code} onDone={reload} onClose={() => setPanel(null)} />}
      {panel === 'claim' && <Claim book={book} code={code} onClose={() => setPanel(null)} />}
      {panel === 'download' && <DownloadBook book={book} code={code} everything={can('transfer')} onClose={() => setPanel(null)} />}
    </View>
  )
}

function Chip({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
      <Text style={styles.chipText}>{title}</Text>
    </Pressable>
  )
}

/** A zip of the book's original photos: all of them for the owner and transfer-code holders, else the openly licensed ones. */
function DownloadBook({ book, code, everything, onClose }: { book: BookWithPages; code: string | null; everything: boolean; onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'busy' | Error>('idle')

  const download = async () => {
    setState('busy')

    try {
      await ApiDownload.book(book.id, code).share(`Save “${book.title}”`)
      onClose()
    } catch (problem) {
      setState(problem instanceof Error ? problem : new Error("We couldn't make the zip."))
    }
  }

  return (
    <Sheet title="Download the photos" onClose={onClose}>
      <Text variant="muted">{everything ? 'Every original photo in this book, as a zip.' : 'The openly licensed photos in this book, as a zip.'}</Text>
      {state instanceof Error ? <Callout>{state.message}</Callout> : null}
      <Button title={state === 'busy' ? 'Making the zip…' : 'Download zip'} size="lg" loading={state === 'busy'} onPress={download} />
    </Sheet>
  )
}

/** Code holders with "add" put photos from their camera roll onto new pages at the end. */
function AddPhotos({ book, code, onDone, onClose }: { book: BookWithPages; code: string | null; onDone: () => void; onClose: () => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [failed, setFailed] = useState<string[]>([])

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, orderedSelection: true, selectionLimit: 20, quality: 1 })

    if (result.canceled) return

    const problems: string[] = []
    const { maxPhotoMb } = await appLimits.refresh()

    setFailed([])

    for (const [i, asset] of result.assets.entries()) {
      const name = asset.fileName ?? `Photo ${i + 1}`

      setProgress({ done: i, total: result.assets.length })

      if (asset.fileSize && asset.fileSize > megabytes(maxPhotoMb)) {
        problems.push(`${name} is larger than ${maxPhotoMb} MB`)
        continue
      }

      try {
        await api.books.addPhoto(book.id, uploadFile(asset), { width: asset.width || undefined, height: asset.height || undefined }, code).send()
      } catch {
        problems.push(`${name} didn't upload`)
      }
    }

    setProgress(null)
    setFailed(problems)
    onDone()
  }

  return (
    <Sheet title="Add photos" onClose={onClose}>
      <Text variant="muted">Each photo goes on a new page at the end of “{book.title}”. The book's owner keeps them in their library.</Text>
      {failed.length ? <Callout>{failed.join('. ')}.</Callout> : null}
      <Button
        title={progress ? `Adding ${progress.done + 1} of ${progress.total}…` : 'Choose photos'}
        size="lg"
        loading={!!progress}
        onPress={() => pick().catch(() => setProgress(null))}
      />
    </Sheet>
  )
}

/** Code holders with "transfer" take the book onto their own shelf. */
function Claim({ book, code, onClose }: { book: BookWithPages; code: string | null; onClose: () => void }) {
  const { user } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const owner = book.owner.name

  const claim = async () => {
    setBusy(true)
    setError(null)

    try {
      await api.accessCodes.claim(code ?? '').send()
      await bookCodes.forget(book.id)
      bookLists.reload()
      onClose()
      router.replace({ pathname: '/books/[id]/edit', params: { id: book.id } })
    } catch (problem) {
      setError(FormProblem.from(problem).message ?? "We couldn't move the book to your shelf.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Make this book yours" onClose={onClose}>
      <Text>
        “{book.title}” moves to your shelf with its own copies of every photo. You can edit it, share it and choose who can open it.
        {owner ? ` ${owner} will no longer be able to open or change it.` : ' Its current owner will no longer be able to open or change it.'}
      </Text>
      <Text variant="muted">Every access code for the book stops working, so share new ones once it's yours.</Text>
      {error ? <Callout>{error}</Callout> : null}
      {user ? (
        <View style={styles.row}>
          <Button title="Not now" variant="secondary" onPress={onClose} style={styles.flex} />
          <Button title={busy ? 'Moving it…' : 'Make it mine'} loading={busy} onPress={claim} style={styles.flex} />
        </View>
      ) : (
        <>
          <Text style={styles.strong}>Sign in or join first, then come back to this book.</Text>
          <View style={styles.row}>
            <Button title="Sign in" variant="secondary" onPress={() => router.push('/signin')} style={styles.flex} />
            <Button title="Join free" onPress={() => router.push('/signup')} style={styles.flex} />
          </View>
        </>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  reader: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  problem: { width: '100%', maxWidth: 420, gap: 16 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  round: { padding: 10, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  chipPressed: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  strong: { fontFamily: fonts.semibold, color: colors.ink900 },
})
