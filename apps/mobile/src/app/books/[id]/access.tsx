import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import { BOOK_PERMISSIONS, type BookAccessCode, type BookPermission, type BookWithPages } from '@photos/types'
import { Button, Callout, CheckOption, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { FormProblem } from '@/lib/forms'
import { colors, fonts, radius } from '@/theme'

const EXPIRY = [
  { value: '', label: 'Never expires' },
  { value: '1', label: '1 day' },
  { value: '7', label: '1 week' },
  { value: '30', label: '30 days' },
]
const EXTRA: BookPermission[] = ['add', 'edit', 'transfer']
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/** The owner's access codes for a book: make one, change what it allows, share it or revoke it. */
export default function BookAccess() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const book = useRequest(() => api.books.get(id), { cacheFor: null })
  const codes = useRequest(() => api.books.accessCodes(id))
  const title = (book.data?.data as BookWithPages | undefined)?.title
  const list: BookAccessCode[] = codes.data?.data ?? []
  const problem = codes.error ?? book.error

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.ink900} />
      </Pressable>
      <Text variant="display">Access codes</Text>
      <Text variant="muted">
        Anyone you give a code to can open {title ? `“${title}”` : 'this book'}, even while it's private. Choose what else each code lets them do. Revoke a code to lock
        them out again.
      </Text>

      {problem ? <Callout>{FormProblem.from(problem).message}</Callout> : null}
      <NewCode bookId={id} onCreated={(code) => codes.update({ data: { ...codes.data, data: [code, ...list] } })} />

      <Text variant="title" style={styles.section}>
        Codes
      </Text>
      {codes.loading && !list.length ? <ActivityIndicator color={colors.ink500} /> : null}
      {!codes.loading && !list.length ? <Text variant="muted">No codes yet. Make one above to share the book.</Text> : null}
      {list.map((code) => (
        <CodeCard
          key={code.id}
          bookId={id}
          code={code}
          onChange={(next) => codes.update({ data: { ...codes.data, data: list.map((entry) => (entry.id === next.id ? next : entry)) } })}
          onRevoked={() => codes.update({ data: { ...codes.data, data: list.filter((entry) => entry.id !== code.id) } })}
        />
      ))}
    </ScrollView>
  )
}

function NewCode({ bookId, onCreated }: { bookId: string; onCreated: (code: BookAccessCode) => void }) {
  const [label, setLabel] = useState('')
  const [permissions, setPermissions] = useState<BookPermission[]>([])
  const [expiresIn, setExpiresIn] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    setBusy(true)
    setError(null)

    try {
      const days = Number(expiresIn) || null
      const expiresAt = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null
      const { data: code } = await api.books.createAccessCode(bookId, { label: label.trim() || null, permissions, expiresAt }).send()

      onCreated(code)
      setLabel('')
      setPermissions([])
      setExpiresIn('')
    } catch (problem) {
      setError(FormProblem.from(problem).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text variant="title">New code</Text>
      {error ? <Callout>{error}</Callout> : null}
      <Field label="Who it's for" hint="Only you see this.">
        <Input value={label} onChangeText={setLabel} maxLength={80} placeholder="e.g. Ada and Tunde" />
      </Field>
      <Field label="Works for">
        <Select label="Works for" options={EXPIRY} value={expiresIn} onChange={setExpiresIn} />
      </Field>
      <PermissionPicker selected={permissions} onChange={setPermissions} />
      <Button title={busy ? 'Making…' : 'Make code'} loading={busy} onPress={create} />
    </View>
  )
}

function CodeCard({ bookId, code, onChange, onRevoked }: { bookId: string; code: BookAccessCode; onChange: (code: BookAccessCode) => void; onRevoked: () => void }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(code.label ?? '')
  const [permissions, setPermissions] = useState<BookPermission[]>(code.permissions.filter((permission) => permission !== 'view'))
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setError(null)

    try {
      await task()
    } catch (problem) {
      setError(FormProblem.from(problem).message)
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      const { data } = await api.books.updateAccessCode(bookId, code.id, { label: label.trim() || null, permissions }).send()

      onChange(data)
      setEditing(false)
    })

  const revoke = async () => {
    if (!(await confirm('Revoke this code?', 'Anyone using it loses access to the book.', 'Revoke'))) return

    await run(async () => {
      await api.books.revokeAccessCode(bookId, code.id).send()
      onRevoked()
    })
  }

  const copy = async () => {
    await Clipboard.setStringAsync(code.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <View style={[styles.card, code.expired && styles.expired]}>
      <View style={styles.codeRow}>
        <Text selectable style={styles.code}>
          {code.code}
        </Text>
        <Text variant="link" accessibilityRole="button" onPress={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </View>
      <Text variant="muted">
        {code.label ?? 'No label'} · {expiry(code)} · used {code.uses} {code.uses === 1 ? 'time' : 'times'}
      </Text>
      <View style={styles.badges}>
        {code.permissions.map((permission) => (
          <View key={permission} style={styles.badge}>
            <Text style={styles.badgeText}>{BOOK_PERMISSIONS[permission].label}</Text>
          </View>
        ))}
      </View>
      {error ? <Callout>{error}</Callout> : null}

      {editing ? (
        <>
          <Field label="Who it's for">
            <Input value={label} onChangeText={setLabel} maxLength={80} />
          </Field>
          <PermissionPicker selected={permissions} onChange={setPermissions} />
          <View style={styles.row}>
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.flex} />
            <Button title={busy ? 'Saving…' : 'Save'} loading={busy} onPress={save} style={styles.flex} />
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <Button title="Share link" variant="secondary" disabled={code.expired} onPress={() => Share.share({ message: code.shareUrl }).catch(() => undefined)} />
          <Button title="Change" variant="ghost" onPress={() => setEditing(true)} />
          <Button title="Revoke" variant="danger" disabled={busy} onPress={revoke} />
        </View>
      )}
    </View>
  )
}

/** Every code can view the book. Pick what else it allows. */
function PermissionPicker({ selected, onChange }: { selected: BookPermission[]; onChange: (permissions: BookPermission[]) => void }) {
  const toggle = (permission: BookPermission) => onChange(selected.includes(permission) ? selected.filter((entry) => entry !== permission) : [...selected, permission])

  return (
    <View style={styles.permissions}>
      <CheckOption label={BOOK_PERMISSIONS.view.label} description={`${BOOK_PERMISSIONS.view.description}. Every code allows this.`} checked disabled />
      {EXTRA.map((permission) => (
        <CheckOption
          key={permission}
          label={BOOK_PERMISSIONS[permission].label}
          description={BOOK_PERMISSIONS[permission].description}
          checked={selected.includes(permission)}
          onPress={() => toggle(permission)}
        />
      ))}
    </View>
  )
}

function expiry(code: BookAccessCode) {
  if (!code.expiresAt) return 'Never expires'

  return `${code.expired ? 'Expired' : 'Expires'} ${dateFormat.format(new Date(code.expiresAt))}`
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, gap: 12 },
  back: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4 },
  section: { marginTop: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { gap: 12, padding: 16, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.surface200, backgroundColor: colors.white },
  expired: { opacity: 0.6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontFamily: fonts.semibold, fontSize: 20, letterSpacing: 2, color: colors.ink900 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.surface100 },
  badgeText: { fontSize: 12, fontFamily: fonts.medium, color: colors.ink700 },
  permissions: { gap: 8 },
})
