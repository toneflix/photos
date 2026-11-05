import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import { uploads, useUploads } from '@/lib/uploads'
import { colors, radius } from '@/theme'

const ICONS = { waiting: null, uploading: 'cloud-upload', done: 'checkmark-circle', failed: 'alert-circle' } as const

/** Thumbnails of the photos being uploaded, each marked as it finishes. */
export function UploadProgress() {
  const { items, done, failed } = useUploads()

  if (!items.length) return null

  const finished = done === items.length

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text variant="label">{finished ? `Uploaded ${items.length - failed.length} of ${items.length}` : `Uploading ${done + 1} of ${items.length}…`}</Text>
        {finished && (
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} onPress={() => uploads.dismiss()}>
            <Ionicons name="close" size={20} color={colors.ink500} />
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {items.map((item) => {
          const icon = ICONS[item.status]

          return (
            <View key={item.key} style={styles.thumb}>
              <Image source={{ uri: item.uri }} style={[StyleSheet.absoluteFill, item.status !== 'done' && styles.dim]} contentFit="cover" />
              {icon && <Ionicons name={icon} size={20} color={item.status === 'failed' ? colors.red700 : colors.white} style={styles.icon} />}
            </View>
          )
        })}
      </ScrollView>
      {failed.map((reason) => (
        <Text key={reason} style={styles.failed}>
          {reason}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strip: { gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface300 },
  dim: { opacity: 0.5 },
  icon: { textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  failed: { fontSize: 13, color: colors.red700 },
})
