import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import { SPACE_PERMISSIONS, type PublicSpace, type SpaceMember, type SpacePermission } from '@photos/types'
import { Button, Callout, CheckOption, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { FormProblem } from '@/lib/forms'
import { colors, fonts, radius } from '@/theme'

/** Who is in a space and what they may do. Owners and members who manage the space invite and change people here. */
export default function SpaceMembers() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const insets = useSafeAreaInsets()
  const { data, error, loading } = useRequest(() => api.explore.space(slug))
  const space: PublicSpace | undefined = data?.data

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.ink900} />
      </Pressable>
      <Text variant="display">Members</Text>
      <Text variant="muted">
        People you invite can open {space ? `“${space.name}”` : 'this space'} even while it's private, and see its public photos and books. Pick what else each
        person can do.
      </Text>

      {error ? <Callout>{FormProblem.from(error).message}</Callout> : null}
      {loading && !space ? <ActivityIndicator color={colors.ink500} /> : null}
      {space && <Roster space={space} />}
    </ScrollView>
  )
}

/** The invite form and everyone invited into `space`. */
function Roster({ space }: { space: PublicSpace }) {
  const members = useRequest(() => api.spaces.members(space.id, { per_page: 100 }), { cacheFor: null })
  const list: SpaceMember[] = members.data?.data ?? []

  const replace = (next: SpaceMember[]) => members.update({ data: { ...members.data, data: next } })

  return (
    <>
      {members.error ? <Callout>{FormProblem.from(members.error).message}</Callout> : null}
      <Invite spaceId={space.id} canManage={space.canEdit} onInvited={(member) => replace([member, ...list])} />

      <Text variant="title" style={styles.section}>
        {list.length ? `${list.length} ${list.length === 1 ? 'person' : 'people'}` : 'Nobody invited yet'}
      </Text>
      {members.loading && !list.length ? <ActivityIndicator color={colors.ink500} /> : null}
      {list.map((member) => (
        <MemberCard
          key={member.id}
          spaceId={space.id}
          member={member}
          canManage={space.canEdit}
          onChange={(next) => replace(list.map((entry) => (entry.id === next.id ? next : entry)))}
          onRemoved={() => replace(list.filter((entry) => entry.id !== member.id))}
        />
      ))}
    </>
  )
}

function Invite({ spaceId, canManage, onInvited }: { spaceId: string; canManage: boolean; onInvited: (member: SpaceMember) => void }) {
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<SpacePermission[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<FormProblem | null>(null)

  const invite = async () => {
    setBusy(true)
    setProblem(null)

    try {
      const { data: member } = await api.spaces.invite(spaceId, { email: email.trim(), permissions }).send()

      onInvited(member)
      setEmail('')
      setPermissions([])
    } catch (error) {
      setProblem(FormProblem.from(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text variant="title">Invite someone</Text>
      {problem?.summary ? <Callout>{problem.summary}</Callout> : null}
      <Field label="Email address" error={problem?.fields.email} hint="They get an email and join from an account with this address.">
        <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="ada@example.com" />
      </Field>
      <PermissionPicker selected={permissions} canManage={canManage} onChange={setPermissions} />
      <Button title={busy ? 'Sending…' : 'Send invite'} loading={busy} disabled={!email.trim()} onPress={invite} />
    </View>
  )
}

function MemberCard({
  spaceId,
  member,
  canManage,
  onChange,
  onRemoved,
}: {
  spaceId: string
  member: SpaceMember
  canManage: boolean
  onChange: (member: SpaceMember) => void
  onRemoved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [permissions, setPermissions] = useState<SpacePermission[]>(member.permissions.filter((permission) => permission !== 'view'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invited = member.status === 'invited'
  const locked = member.permissions.includes('manage') && !canManage

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
      const { data } = await api.spaces.updateMember(spaceId, member.id, permissions).send()

      onChange(data)
      setEditing(false)
    })

  const remove = async () => {
    const asked = invited
      ? await confirm('Cancel this invite?', `${member.email} won't be able to join.`, 'Cancel invite')
      : await confirm(`Remove ${member.name ?? member.email}?`, 'Their photos and books leave the space and stay in their own library.', 'Remove')

    if (!asked) return

    await run(async () => {
      await api.spaces.removeMember(spaceId, member.id).send()
      onRemoved()
    })
  }

  return (
    <View style={[styles.card, busy && styles.busy]}>
      <View>
        <Text style={styles.name} numberOfLines={1}>
          {member.name ?? member.email}
        </Text>
        <Text variant="muted" numberOfLines={1}>
          {member.name ? `${member.email} · ` : ''}
          {invited ? 'Invite sent, not joined yet' : 'Joined'}
        </Text>
      </View>
      <View style={styles.badges}>
        {SPACE_PERMISSIONS.filter((permission) => member.permissions.includes(permission.value)).map((permission) => (
          <View key={permission.value} style={styles.badge}>
            <Text style={styles.badgeText}>{permission.label}</Text>
          </View>
        ))}
      </View>
      {error ? <Callout>{error}</Callout> : null}

      {editing ? (
        <>
          <PermissionPicker selected={permissions} canManage={canManage} onChange={setPermissions} />
          <View style={styles.row}>
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.flex} />
            <Button title={busy ? 'Saving…' : 'Save'} loading={busy} onPress={save} style={styles.flex} />
          </View>
        </>
      ) : (
        !locked && (
          <View style={styles.row}>
            <Button title="Change" variant="ghost" onPress={() => setEditing(true)} />
            <Button title={invited ? 'Cancel invite' : 'Remove'} variant="danger" disabled={busy} onPress={remove} />
          </View>
        )
      )}
    </View>
  )
}

/** Every member can view. Pick what else they may do; only the owner can hand out `manage`. */
function PermissionPicker({ selected, canManage, onChange }: { selected: SpacePermission[]; canManage: boolean; onChange: (permissions: SpacePermission[]) => void }) {
  const toggle = (permission: SpacePermission) => onChange(selected.includes(permission) ? selected.filter((entry) => entry !== permission) : [...selected, permission])

  return (
    <View style={styles.permissions}>
      {SPACE_PERMISSIONS.map((permission) => {
        const fixed = permission.value === 'view' || (permission.value === 'manage' && !canManage)
        const note = permission.value === 'view' ? ' Every member can.' : fixed ? ' Only the owner can give this.' : ''

        return (
          <CheckOption
            key={permission.value}
            label={permission.label}
            description={`${permission.summary}${note}`}
            checked={permission.value === 'view' || selected.includes(permission.value)}
            disabled={fixed}
            onPress={() => toggle(permission.value)}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, gap: 12 },
  back: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4 },
  section: { marginTop: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { gap: 12, padding: 16, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.surface200, backgroundColor: colors.white },
  busy: { opacity: 0.6 },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink900 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.surface100 },
  badgeText: { fontSize: 12, fontFamily: fonts.medium, color: colors.ink700 },
  permissions: { gap: 8 },
})
