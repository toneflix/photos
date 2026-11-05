import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { BookPermission, BookWithPages } from '@photos/types'
import { BookCover } from '@/components/BookCover'
import { AuthFrame } from '@/components/AuthFrame'
import { CodeForm } from '@/components/access/CodeForm'
import { Sheet } from '@/components/access/Sheet'
import { PAGE_RATIO, PageView } from '@/components/book/PageView'
import { BookLookContext } from '@/components/book/paper'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { bookCodes, useBookCode } from '@/lib/book-codes'
import { FormProblem } from '@/lib/forms'
import { bookLists } from '@/lib/lists'
import { useSession } from '@/lib/session'
import { MAX_PHOTO_BYTES } from '@/lib/uploads'
import { uploadFile } from '@/lib/upload-file'
import { colors, fonts, radius } from '@/theme'

/**
 * A book: its cover and pages, and what the visitor may do with it. Opens private books with a saved
 * access code, or a `?code=` from a share link.
 */
export default function BookScreen() {
  const { id, code: shared } = useLocalSearchParams<{ id: string; code?: string }>()
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

  return <LoadBook key={saved ?? 'none'} id={id} code={saved} shareError={shareError} />
}

function LoadBook({ id, code, shareError }: { id: string; code: string | null; shareError: string | null }) {
  const { data, error, loading, send } = useRequest(() => api.books.get(id, code), { cacheFor: null })
  const book: BookWithPages | undefined = data?.data

  if (book) return <Book book={book} code={code} reload={() => send().catch(() => undefined)} />

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

function Book({ book, code, reload }: { book: BookWithPages; code: string | null; reload: () => void }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [panel, setPanel] = useState<'add' | 'claim' | null>(null)
  const can = (permission: BookPermission) => book.permissions.includes(permission)
  const pageWidth = Math.min(width - 32, 480)

  const header = (
    <View style={styles.header}>
      <View style={[styles.cover, { width: pageWidth * 0.6, height: (pageWidth * 0.6) / PAGE_RATIO }]}>
        <BookCover book={book} />
      </View>
      <Text style={styles.title}>{book.title}</Text>
      <Text variant="muted" style={styles.centerText}>
        {[book.owner.name, `${book.pages.length} ${book.pages.length === 1 ? 'page' : 'pages'}`].filter(Boolean).join(' · ')}
      </Text>
      <View style={styles.actions}>
        {book.canEdit && <Button title="Edit" onPress={() => router.push({ pathname: '/books/[id]/edit', params: { id: book.id } })} />}
        {book.isOwner && <Button title="Access codes" variant="secondary" onPress={() => router.push({ pathname: '/books/[id]/access', params: { id: book.id } })} />}
        {!book.isOwner && can('add') && <Button title="Add photos" variant="secondary" onPress={() => setPanel('add')} />}
        {!book.isOwner && can('transfer') && <Button title="Make it yours" variant="secondary" onPress={() => setPanel('claim')} />}
      </View>
    </View>
  )

  return (
    <BookLookContext.Provider value={{ paper: book.paper ?? 'ivory', frame: book.frame ?? 'none' }}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink900} />
        </Pressable>
        <FlatList
          data={book.pages}
          keyExtractor={(page) => page.id}
          ListHeaderComponent={header}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          renderItem={({ item: page, index }) => (
            <View style={styles.page}>
              <PageView page={page} width={pageWidth} number={index + 1} />
            </View>
          )}
          ListEmptyComponent={<Text variant="muted" style={styles.centerText}>This book has no pages yet.</Text>}
        />

        {panel === 'add' && <AddPhotos book={book} code={code} onDone={reload} onClose={() => setPanel(null)} />}
        {panel === 'claim' && <Claim book={book} code={code} onClose={() => setPanel(null)} />}
      </View>
    </BookLookContext.Provider>
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

    setFailed([])

    for (const [i, asset] of result.assets.entries()) {
      const name = asset.fileName ?? `Photo ${i + 1}`

      setProgress({ done: i, total: result.assets.length })

      if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
        problems.push(`${name} is larger than 25 MB`)
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
  screen: { flex: 1, backgroundColor: '#ece6da' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  back: { paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  list: { alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  header: { alignItems: 'center', gap: 8, paddingBottom: 8 },
  cover: { borderTopRightRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden', boxShadow: '0 14px 36px rgba(60,40,20,0.3)' },
  title: { marginTop: 12, fontFamily: fonts.serif, fontSize: 26, lineHeight: 32, textAlign: 'center', color: colors.ink900 },
  centerText: { textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  page: { boxShadow: '0 10px 28px rgba(60,40,20,0.2)', borderRadius: radius.md },
  strong: { fontFamily: fonts.semibold, color: colors.ink900 },
})
