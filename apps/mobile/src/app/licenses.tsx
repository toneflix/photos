import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LICENSES } from '@photos/types'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

const USING = [
  "Check the licence on the photo's page before you use it anywhere.",
  "If it asks for credit, copy the credit line from the photo's page and put it near the photo or in your credits.",
  '"All rights reserved" means look, don\'t take. To use one of these photos, ask the photographer first. Saving or screenshotting it doesn\'t give you permission.',
  "A licence covers the photo, not the people or brands in it. If you're using it in an advert, you may need their permission too.",
]

const SHARING = [
  'Your photos are private until you turn on Show on Explore. You keep all rights unless you pick another licence.',
  'Set the licence for new uploads in your sharing settings, and change it for any photo from your library.',
  'Only photos with an open licence can be saved from the app.',
  'Creative Commons licences can\'t be taken back from someone who already downloaded the photo. Switching back to "All rights reserved" stops new downloads.',
  'Only share photos you took or have the right to share.',
]

/** What each licence lets people do with a photo, and how to use or share photos fairly. */
export default function Licenses() {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.ink900} />
      </Pressable>
      <Text variant="display">Photo licences</Text>
      <Text variant="muted" style={styles.lede}>
        Every photo on Explore belongs to the person who shared it. They choose a licence, and the licence says what everyone else may do with it.
      </Text>

      {LICENSES.map((license) => (
        <View key={license.value} style={styles.card}>
          <Text style={styles.name}>{license.label}</Text>
          <Text variant="muted">
            {license.url ? (
              <Text variant="link" onPress={() => Linking.openURL(license.url!)}>
                {license.name}
              </Text>
            ) : (
              license.name
            )}
            {' · '}
            {license.downloadable ? 'Can be downloaded' : 'No downloads'}
          </Text>
          <Text>{license.summary}</Text>
        </View>
      ))}

      <Guide title="If you're using a photo" points={USING} />
      <Guide title="If you're sharing your photos" points={SHARING} />
    </ScrollView>
  )
}

function Guide({ title, points }: { title: string; points: string[] }) {
  return (
    <View style={styles.guide}>
      <Text variant="title">{title}</Text>
      {points.map((point) => (
        <View key={point} style={styles.point}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.flex}>{point}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, gap: 12 },
  back: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4 },
  lede: { fontSize: 16, lineHeight: 24, marginBottom: 8 },
  card: { gap: 4, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface200 },
  name: { fontFamily: fonts.display, fontSize: 17 },
  guide: { gap: 8, marginTop: 20 },
  point: { flexDirection: 'row', gap: 8 },
  bullet: { color: colors.ink500 },
  flex: { flex: 1, color: colors.ink700 },
})
