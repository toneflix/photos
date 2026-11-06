import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native'
import { useRequest } from 'alova/client'
import { type AccountPlan, type Payment, featureLine, formatBytes, formatMoney, limitLabel } from '@photos/types'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { webUrl } from '@/lib/links'
import { colors, fonts } from '@/theme'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

const STATUS = { complete: 'Paid', pending: 'Waiting', rejected: "Didn't go through" } as const

/** The account's plan, what it uses, and past payments. Plans are bought on the web for now. */
export default function Plan() {
  const request = useRequest(() => api.account.plan())
  const payments = useRequest(() => api.account.payments({ per_page: 10 }))
  const plan: AccountPlan | undefined = request.data?.data
  const history: Payment[] = payments.data?.data ?? []
  const problem = request.error ?? payments.error

  return (
    <SettingsPage title="Plan" description="What your account includes and how much of it you use.">
      {problem ? <Callout>{FormProblem.from(problem).message}</Callout> : null}
      {!plan ? (
        request.error ? null : (
          <ActivityIndicator color={colors.ink500} />
        )
      ) : (
        <>
          <Section>
            <Text variant="label">YOUR PLAN</Text>
            <Text variant="title">{plan.plan.name}</Text>
            <Text variant="muted">
              {plan.endsAt
                ? `Paid until ${dateFormat.format(new Date(plan.endsAt))}.`
                : (plan.plan.description ?? '')}
            </Text>
            <Usage label="Storage" used={plan.usage.storage.used} limit={plan.usage.storage.limit} format={formatBytes} />
            <Usage label="Books" used={plan.usage.books} limit={Number(plan.features.max_books) || 0} />
            <Usage label="Spaces" used={plan.usage.spaces} limit={Number(plan.features.max_spaces) || 0} />
            <Button title={plan.premium ? 'Add more time' : 'See Premium'} variant={plan.premium ? 'secondary' : 'primary'} onPress={() => Linking.openURL(webUrl('/pricing')).catch(() => undefined)} />
          </Section>

          <Section title="What's included">
            {plan.plan.features.map((feature) => (
              <View key={feature.key} style={styles.row}>
                <Text style={[styles.flex, !featureLine(feature).included && styles.muted]}>{feature.title}</Text>
                <Text style={styles.value}>{feature.type === 'toggle' ? (feature.value ? 'Included' : 'Premium') : limitLabel(feature)}</Text>
              </View>
            ))}
          </Section>

          <Section title="Payments">
            {history.length ? (
              history.map((payment) => (
                <View key={payment.id} style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.strong}>{payment.title}</Text>
                    <Text variant="small">{dateFormat.format(new Date(payment.paidAt ?? payment.createdAt))}</Text>
                  </View>
                  <View style={styles.end}>
                    <Text style={styles.strong}>{formatMoney(payment.chargeAmount, payment.chargeCurrency)}</Text>
                    <Text variant="small" style={payment.status === 'complete' && styles.good}>
                      {STATUS[payment.status]}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text variant="muted">No payments yet.</Text>
            )}
          </Section>
        </>
      )}
    </SettingsPage>
  )
}

/** How much of one limit is used, as a bar. A limit of 0 means no limit. */
function Usage({ label, used, limit, format = (value: number) => value.toLocaleString('en') }: { label: string; used: number; limit: number; format?: (value: number) => string }) {
  const share = limit > 0 ? Math.min(100, (used / limit) * 100) : 0

  return (
    <View style={styles.usage}>
      <View style={styles.row}>
        <Text style={styles.strong}>{label}</Text>
        <Text variant="small">
          {format(used)} of {limit > 0 ? format(limit) : 'unlimited'}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${limit > 0 ? Math.max(share, used ? 2 : 0) : 0}%` }, share >= 90 && styles.full]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  end: { alignItems: 'flex-end' },
  muted: { color: colors.ink500 },
  value: { fontFamily: fonts.medium, color: colors.ink900 },
  strong: { fontFamily: fonts.semibold, color: colors.ink900 },
  good: { color: colors.emerald700 },
  usage: { gap: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface200, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.brand500 },
  full: { backgroundColor: colors.amber700 },
})
