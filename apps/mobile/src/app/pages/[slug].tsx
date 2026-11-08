import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import { MarkdownBody } from '@/components/MarkdownBody'
import { Text } from '@/components/ui'
import { api } from '@/lib/api'
import { colors } from '@/theme'

const updated = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** A published page or policy, such as the privacy policy or the about page. */
export default function DocumentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const insets = useSafeAreaInsets()
  const { data, error, loading } = useRequest(() => api.document(slug))
  const document = data?.data

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.ink900} />
      </Pressable>

      {loading && !document ? <ActivityIndicator color={colors.brand600} style={styles.loading} /> : null}
      {error && !document ? <Text variant="muted">This page isn't available.</Text> : null}

      {document ? (
        <View style={styles.document}>
          <Text variant="display">{document.title}</Text>
          {document.summary ? (
            <Text variant="muted" style={styles.lede}>
              {document.summary}
            </Text>
          ) : null}
          <Text variant="small">Updated {updated(document.updatedAt)}</Text>
          <MarkdownBody value={document.body} />
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, gap: 12 },
  back: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4 },
  loading: { marginTop: 40 },
  document: { gap: 8 },
  lede: { fontSize: 16, lineHeight: 24 },
})
