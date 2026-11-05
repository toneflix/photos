import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { downloadAccountExport } from '@/lib/account-export'
import { useAction } from '@/lib/use-action'
import { colors } from '@/theme'

const INCLUDED = ['Every photo, as the original file you uploaded', "Your books, with each page's layout, photos and words", 'Your account details and settings']

export default function Data() {
  const download = useAction()

  return (
    <SettingsPage title="Your data" description="Everything you've kept here is yours. Take a copy whenever you like.">
      <Section>
        {INCLUDED.map((item) => (
          <View key={item} style={styles.item}>
            <Ionicons name="checkmark" size={18} color={colors.emerald600} />
            <Text style={styles.flex}>{item}</Text>
          </View>
        ))}
        {download.problem.message ? <Callout>{download.problem.message}</Callout> : null}
        <Button title={download.busy ? 'Preparing your zip…' : 'Download a zip'} loading={download.busy} onPress={() => download.run(downloadAccountExport)} />
        <Text variant="small">Large libraries can take a minute to start downloading.</Text>
      </Section>
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
})
