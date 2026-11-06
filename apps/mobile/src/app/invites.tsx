import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import { spacePermissionLabels, type SpaceInvite } from '@photos/types'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { spaceLists } from '@/lib/lists'
import { useUser } from '@/lib/session'
import { colors, fonts, radius } from '@/theme'

/** Invites into other people's spaces, sent to the signed-in user's address. */
export default function Invites() {
  const user = useUser()
  const insets = useSafeAreaInsets()
  const invites = useRequest(() => api.spaces.invites({ per_page: 100 }), { cacheFor: null })
  const list: SpaceInvite[] = invites.data?.data ?? []

  const drop = (invite: SpaceInvite) => invites.update({ data: { ...invites.data, data: list.filter((entry) => entry.id !== invite.id) } })

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.ink900} />
      </Pressable>
      <Text variant="display">Space invites</Text>
      <Text variant="muted">People who invited {user.email} into their spaces.</Text>

      {invites.error ? <Callout>{FormProblem.from(invites.error).message}</Callout> : null}
      {!user.emailVerified && list.length > 0 ? <Callout tone="warning">Confirm your email address in Settings before you join a space.</Callout> : null}
      {invites.loading && !list.length ? <ActivityIndicator color={colors.ink500} /> : null}
      {!invites.loading && !list.length ? <Text variant="muted">No invites waiting.</Text> : null}
      {list.map((invite) => (
        <InviteCard key={invite.id} invite={invite} canJoin={user.emailVerified} onDone={() => drop(invite)} />
      ))}
    </ScrollView>
  )
}

function InviteCard({ invite, canJoin, onDone }: { invite: SpaceInvite; canJoin: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const answer = async (choice: 'accept' | 'decline') => {
    setBusy(choice)
    setError(null)

    try {
      if (choice === 'accept') {
        const { data: space } = await api.spaces.acceptInvite(invite.id).send()

        spaceLists.reload()
        onDone()
        router.push({ pathname: '/spaces/[slug]', params: { slug: space.slug } })
      } else {
        await api.spaces.declineInvite(invite.id).send()
        onDone()
      }
    } catch (problem) {
      setError(FormProblem.from(problem).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        <Text style={styles.strong}>{invite.invitedBy?.name ?? 'Someone'}</Text> invited you to <Text style={styles.strong}>{invite.space?.name ?? 'a space'}</Text>
      </Text>
      {invite.space?.description ? <Text variant="muted">{invite.space.description}</Text> : null}
      <Text>You can: {spacePermissionLabels(invite.permissions)}</Text>
      {error ? <Callout>{error}</Callout> : null}
      <View style={styles.row}>
        <Button title={busy === 'accept' ? 'Joining…' : 'Join space'} loading={busy === 'accept'} disabled={!canJoin || !!busy} onPress={() => answer('accept')} />
        <Button title={busy === 'decline' ? 'Declining…' : 'Decline'} variant="ghost" disabled={!!busy} onPress={() => answer('decline')} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, gap: 12 },
  back: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { gap: 10, padding: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.surface200, backgroundColor: colors.white },
  title: { fontSize: 16, lineHeight: 23, color: colors.ink900 },
  strong: { fontFamily: fonts.semibold },
})
