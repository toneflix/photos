import { useState } from 'react'
import { Pressable, StyleSheet, Switch, View } from 'react-native'
import { router } from 'expo-router'
import { LICENSES, type PhotoLicense } from '@photos/types'
import { VISIBILITY } from '@/components/settings/groups'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { bookLists } from '@/lib/lists'
import { session, useUser } from '@/lib/session'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

export default function Sharing() {
  const user = useUser()
  const privacy = useAction()
  const lock = useAction()
  const [visibility, setVisibility] = useState(user.defaultVisibility)
  const [license, setLicense] = useState<PhotoLicense>(user.defaultLicense ?? 'all-rights-reserved')
  const [showName, setShowName] = useState(user.showOwnerName)
  const [showCounts, setShowCounts] = useState(user.showCounts)

  const save = () =>
    privacy.run(async () => {
      const { data } = await api.account.updatePrivacy({ defaultVisibility: visibility, defaultLicense: license, showOwnerName: showName, showCounts }).send()

      await session.setUser(data)

      return 'Saved.'
    })

  const lockAll = async () => {
    if (!(await confirm('Make all books private?', 'Shared links stop working until you share each book again.', 'Make private'))) return

    await lock.run(async () => {
      const { data } = await api.account.lockBooks().send()

      bookLists.reload()

      return data.updated ? `${data.updated} ${data.updated === 1 ? 'book is' : 'books are'} private now.` : 'All your books were already private.'
    })
  }

  return (
    <SettingsPage title="Sharing" description="Who can open your new books and reuse your new photos.">
      <Section title="Who can open a new book">
        {VISIBILITY.map((option) => (
          <Choice key={option.value} label={option.label} hint={option.hint} selected={visibility === option.value} onPress={() => setVisibility(option.value)} />
        ))}
      </Section>

      <Section title="Licence for new photos" description="What people may do with your photos on Explore.">
        <Text variant="link" accessibilityRole="link" onPress={() => router.push('/licenses')}>
          About licences
        </Text>
        {LICENSES.map((option) => (
          <Choice key={option.value} label={option.label} hint={option.forCreators} selected={license === option.value} onPress={() => setLicense(option.value)} />
        ))}
      </Section>

      <Section>
        <View style={styles.toggle}>
          <View style={styles.flex}>
            <Text style={styles.label}>Show my name on work I share</Text>
            <Text variant="small">When off, people don't see who made your public photos and books, and only you can open your profile.</Text>
          </View>
          <Switch value={showName} onValueChange={setShowName} trackColor={{ true: colors.brand600, false: colors.surface300 }} />
        </View>
        <View style={styles.toggle}>
          <View style={styles.flex}>
            <Text style={styles.label}>Show view and download counts on my public work</Text>
            <Text variant="small">When off, only you see how often your photos, books and spaces are viewed and downloaded.</Text>
          </View>
          <Switch value={showCounts} onValueChange={setShowCounts} trackColor={{ true: colors.brand700, false: colors.surface300 }} />
        </View>
      </Section>

      {privacy.problem.message ? <Callout>{privacy.problem.message}</Callout> : null}
      <Button title={privacy.busy ? 'Saving…' : 'Save'} size="lg" loading={privacy.busy} onPress={save} />

      <Section title="Stop sharing everything" description="Makes every book private at once. Shared links stop working.">
        {lock.problem.message ? <Callout>{lock.problem.message}</Callout> : null}
        <Button title="Make all books private" variant="secondary" loading={lock.busy} onPress={lockAll} />
      </Section>
    </SettingsPage>
  )
}

function Choice({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, selected && styles.chosen]}>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text variant="small">{hint}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  choice: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.surface300 },
  chosen: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  radio: { width: 20, height: 20, marginTop: 1, borderRadius: 10, borderWidth: 2, borderColor: colors.surface300, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.brand600 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand600 },
  label: { fontFamily: fonts.semibold, color: colors.ink900 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})
