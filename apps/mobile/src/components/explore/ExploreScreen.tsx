import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Segmented } from '@/components/Segmented'
import { Text } from '@/components/ui'
import { PublicBooks, PublicPhotos, PublicSpaces } from './ExploreLists'

type Tab = 'photos' | 'books' | 'spaces'

const TABS: { value: Tab; label: string }[] = [
  { value: 'photos', label: 'Photos' },
  { value: 'books', label: 'Books' },
  { value: 'spaces', label: 'Spaces' },
]

/** Explore: photos, books and spaces people chose to share with everyone. */
export function ExploreScreen() {
  const [tab, setTab] = useState<Tab>('photos')
  const header = (
    <View style={styles.header}>
      <Text variant="display">Explore</Text>
      <Text variant="muted">Photos, books and spaces people chose to share with everyone.</Text>
      <View style={styles.tabs}>
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </View>
    </View>
  )

  if (tab === 'books') return <PublicBooks header={header} />
  if (tab === 'spaces') return <PublicSpaces header={header} />

  return <PublicPhotos header={header} />
}

const styles = StyleSheet.create({
  header: { gap: 4, paddingTop: 20 },
  tabs: { marginTop: 18, marginBottom: 6 },
})
