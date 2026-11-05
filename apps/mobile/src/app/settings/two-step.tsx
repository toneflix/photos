import { useState } from 'react'
import { ActivityIndicator, Linking, Share, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { useRequest } from 'alova/client'
import type { TwoFactorSetup, TwoFactorStatus } from '@photos/types'
import { QrCode } from '@/components/settings/QrCode'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, OtpInput, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export default function TwoStep() {
  const status = useRequest(() => api.account.twoFactor())
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [codes, setCodes] = useState<{ list: string[]; message: string } | null>(null)
  const [offMessage, setOffMessage] = useState<string | null>(null)
  const current: TwoFactorStatus | undefined = status.data?.data

  const show = (next: TwoFactorStatus) => status.update({ data: { ...status.data, data: next } })

  return (
    <SettingsPage title="Two-step sign-in" description="After your password, ask for a code from an authenticator app like Google Authenticator or 1Password.">
      <Section>
        {!current ? (
          status.error ? <Callout>{FormProblem.from(status.error).message}</Callout> : <ActivityIndicator color={colors.ink500} />
        ) : codes ? (
          <RecoveryCodes codes={codes.list} message={codes.message} onDone={() => setCodes(null)} />
        ) : current.enabled ? (
          <On
            status={current}
            onCodes={(next, list) => {
              show(next)
              setCodes({ list, message: 'Your old recovery codes no longer work.' })
            }}
            onOff={(next) => {
              show(next)
              setOffMessage('Two-step sign-in is off.')
            }}
          />
        ) : setup ? (
          <SetupSteps
            setup={setup}
            onEnabled={(next, list) => {
              setSetup(null)
              show(next)
              setCodes({ list, message: 'Two-step sign-in is on.' })
            }}
          />
        ) : (
          <Off message={offMessage} onStarted={setSetup} />
        )}
      </Section>
    </SettingsPage>
  )
}

function Off({ message, onStarted }: { message: string | null; onStarted: (setup: TwoFactorSetup) => void }) {
  const start = useAction()

  const begin = () =>
    start.run(async () => {
      const { data } = await api.account.setupTwoFactor().send()

      onStarted(data)
    })

  return (
    <>
      {message ? <Callout tone="notice">{message}</Callout> : null}
      <View style={styles.state}>
        <View style={[styles.dot, styles.dotOff]} />
        <Text variant="muted">Off. Anyone with your password can sign in.</Text>
      </View>
      {start.problem.message ? <Callout>{start.problem.message}</Callout> : null}
      <Button title={start.busy ? 'Starting…' : 'Turn on two-step sign-in'} loading={start.busy} onPress={begin} />
    </>
  )
}

function SetupSteps({ setup, onEnabled }: { setup: TwoFactorSetup; onEnabled: (status: TwoFactorStatus, codes: string[]) => void }) {
  const enable = useAction()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const key = setup.secret.match(/.{1,4}/g)?.join(' ') ?? setup.secret

  const confirm = (value = code) =>
    enable.run(async () => {
      const { data } = await api.account.enableTwoFactor({ code: value }).send()
      const { recoveryCodes, ...next } = data

      onEnabled(next, recoveryCodes)
    })

  const copyKey = async () => {
    await Clipboard.setStringAsync(setup.secret)
    setCopied(true)
  }

  return (
    <>
      <Text style={styles.step}>1. Add Toneflix Photos to your authenticator app.</Text>
      <Button title="Open my authenticator app" variant="secondary" onPress={() => Linking.openURL(setup.otpauthUrl).catch(() => undefined)} />
      <View style={styles.qr}>
        <QrCode value={setup.otpauthUrl} size={168} />
      </View>
      <Text variant="muted">Using another device? Scan the code. Or enter this key:</Text>
      <View style={styles.keyRow}>
        <Text selectable style={styles.key}>
          {key}
        </Text>
        <Text variant="link" accessibilityRole="button" onPress={copyKey}>
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </View>
      <Text style={styles.step}>2. Type the 6-digit code the app shows.</Text>
      <Field label="Code" error={enable.problem.fields.code}>
        <OtpInput value={code} onChange={setCode} onComplete={confirm} invalid={!!enable.problem.fields.code} disabled={enable.busy} />
      </Field>
      {enable.problem.summary ? <Callout>{enable.problem.summary}</Callout> : null}
      <Button title={enable.busy ? 'Checking…' : 'Turn on'} loading={enable.busy} disabled={code.length < 6} onPress={() => confirm()} />
    </>
  )
}

function On({
  status,
  onCodes,
  onOff,
}: {
  status: TwoFactorStatus
  onCodes: (status: TwoFactorStatus, codes: string[]) => void
  onOff: (status: TwoFactorStatus) => void
}) {
  const regenerate = useAction()
  const disable = useAction()
  const [password, setPassword] = useState('')

  const newCodes = () =>
    regenerate.run(async () => {
      const { data } = await api.account.regenerateRecoveryCodes().send()
      const { recoveryCodes, ...next } = data

      onCodes(next, recoveryCodes)
    })

  const turnOff = () =>
    disable.run(async () => {
      const { data } = await api.account.disableTwoFactor({ password }).send()

      onOff(data)
    })

  return (
    <>
      <View style={styles.on}>
        <View style={styles.state}>
          <View style={styles.dot} />
          <Text style={styles.onText}>On since {status.enabledAt ? dateFormat.format(new Date(status.enabledAt)) : 'recently'}</Text>
        </View>
        <Text style={styles.onText}>{status.recoveryCodesRemaining} recovery codes left</Text>
      </View>
      {regenerate.problem.message ? <Callout>{regenerate.problem.message}</Callout> : null}
      <Button title="Make new recovery codes" variant="secondary" loading={regenerate.busy} onPress={newCodes} />
      <View style={styles.divider} />
      <Field label="Password to turn it off" error={disable.problem.fields.password}>
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
      </Field>
      {disable.problem.summary ? <Callout>{disable.problem.summary}</Callout> : null}
      <Button title={disable.busy ? 'Turning off…' : 'Turn off'} variant="danger" loading={disable.busy} disabled={!password} onPress={turnOff} />
    </>
  )
}

function RecoveryCodes({ codes, message, onDone }: { codes: string[]; message: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const text = codes.join('\n')

  const copy = async () => {
    await Clipboard.setStringAsync(text)
    setCopied(true)
  }

  return (
    <>
      <Callout tone="notice">{message}</Callout>
      <Text>Save these recovery codes somewhere safe. Each one signs you in once if you lose your phone. You won't see them again.</Text>
      <View style={styles.codes}>
        {codes.map((code) => (
          <Text key={code} selectable style={styles.code}>
            {code}
          </Text>
        ))}
      </View>
      <View style={styles.row}>
        <Button title={copied ? 'Copied' : 'Copy'} variant="secondary" onPress={copy} />
        <Button title="Share" variant="secondary" onPress={() => Share.share({ message: `Toneflix Photos recovery codes\n\n${text}\n` }).catch(() => undefined)} />
        <Button title="I've saved them" variant="dark" onPress={onDone} />
      </View>
      <Text variant="link" accessibilityRole="button" onPress={() => router.back()}>
        Back to settings
      </Text>
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.emerald600 },
  dotOff: { backgroundColor: colors.surface300 },
  on: { gap: 4, padding: 12, borderRadius: radius.lg, backgroundColor: colors.emerald50 },
  onText: { fontFamily: fonts.medium, fontSize: 14, color: colors.emerald900 },
  divider: { height: 1, backgroundColor: colors.surface200 },
  step: { fontFamily: fonts.semibold, color: colors.ink900 },
  qr: { alignSelf: 'center', padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface200, backgroundColor: colors.white },
  keyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface100 },
  key: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 1, color: colors.ink900 },
  codes: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  code: { width: '50%', fontFamily: fonts.semibold, fontSize: 15, letterSpacing: 1, color: colors.ink900 },
})
