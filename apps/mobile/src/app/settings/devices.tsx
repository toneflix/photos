import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRequest } from 'alova/client'
import type { Session } from '@photos/types'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export default function Devices() {
  const sessions = useRequest(() => api.account.sessions())
  const action = useAction()
  const list: Session[] = sessions.data?.data ?? []
  const others = list.filter((session) => !session.current).length

  const keep = (next: Session[]) => sessions.update({ data: { ...sessions.data, data: next } })

  const signOut = (session: Session) =>
    action.run(async () => {
      await api.account.revokeSession(session.id).send()

      keep(list.filter((entry) => entry.id !== session.id))

      return `Signed out of ${session.name}.`
    })

  const signOutOthers = () =>
    action.run(async () => {
      const { data } = await api.account.revokeOtherSessions().send()

      keep(list.filter((entry) => entry.current))

      return data.revoked === 1 ? 'Signed out of 1 other device.' : `Signed out of ${data.revoked} other devices.`
    })

  return (
    <SettingsPage title="Devices" description="Where you're signed in. Sign out of any device you don't recognise, then change your password.">
      <Section>
        {action.message ? <Callout tone="notice">{action.message}</Callout> : null}
        {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
        {sessions.error ? <Callout>{FormProblem.from(sessions.error).message}</Callout> : null}
        {sessions.loading && !list.length ? <ActivityIndicator color={colors.ink500} /> : null}
        {list.map((session, i) => (
          <View key={session.id} style={[styles.device, i > 0 && styles.divided]}>
            <View style={styles.icon}>
              <Ionicons name={icon(session)} size={20} color={colors.ink700} />
            </View>
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{session.name}</Text>
                {session.current ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>This device</Text>
                  </View>
                ) : null}
              </View>
              <Text variant="small">{[detail(session), session.ipAddress, lastActive(session)].filter(Boolean).join(' · ')}</Text>
            </View>
            {!session.current ? (
              <Text accessibilityRole="button" disabled={action.busy} onPress={() => signOut(session)} style={styles.signOut}>
                Sign out
              </Text>
            ) : null}
          </View>
        ))}
        {others > 0 ? <Button title="Sign out of all other devices" variant="secondary" loading={action.busy} onPress={signOutOthers} /> : null}
      </Section>
    </SettingsPage>
  )
}

function icon(session: Session) {
  if (session.deviceType === 'mobile') return 'phone-portrait-outline'
  if (session.deviceType === 'tablet') return 'tablet-portrait-outline'

  return 'desktop-outline'
}

/** Browser and system, unless the device name already says it. */
function detail(session: Session) {
  const text = session.browser && session.os ? `${session.browser} on ${session.os}` : (session.browser ?? session.os)

  return text === session.name ? null : text
}

function lastActive(session: Session) {
  if (session.current) return 'Active now'

  const at = new Date(session.lastUsedAt ?? session.createdAt).getTime()
  const minutes = Math.round((Date.now() - at) / 60_000)

  if (minutes < 5) return 'Active now'
  if (minutes < 60) return `Active ${minutes} min ago`
  if (minutes < 60 * 24) return `Active ${Math.round(minutes / 60)} h ago`

  return `Last active ${dateFormat.format(at)}`
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  device: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divided: { paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.surface200 },
  icon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface100 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.medium, color: colors.ink900 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.emerald50 },
  badgeText: { fontSize: 12, fontFamily: fonts.medium, color: colors.emerald900 },
  signOut: { padding: 8, fontFamily: fonts.medium, color: colors.red700 },
})
