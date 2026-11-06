import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { Photo, PhotoDownloadPreset } from '@photos/types'
import { Sheet } from '@/components/access/Sheet'
import { Button, Callout, CheckOption, Field, Input, Text } from '@/components/ui'
import { ApiDownload } from '@/lib/download'
import type { DownloadSize } from '@/lib/download-request'
import { toast } from '@/lib/toast'
import { colors, fonts, radius } from '@/theme'

const LABELS: Record<PhotoDownloadPreset, string> = {
  original: 'Original',
  large: 'Large',
  medium: 'Medium',
  small: 'Small',
}

type Choice = PhotoDownloadPreset | 'custom'

/**
 * Pick a size before saving a photo: the original, a smaller preset, or custom dimensions.
 * With "Keep the photo's shape" on, only the width is sent and the height follows it; off, the photo
 * is cropped from the centre to the exact size.
 */
export function DownloadSheet({ photo, owned, onClose }: { photo: Pick<Photo, 'id' | 'downloads'>; owned: boolean; onClose: () => void }) {
  const original = photo.downloads[0]
  const ratio = original?.width && original.height ? original.height / original.width : null
  const [choice, setChoice] = useState<Choice>('original')
  const [width, setWidth] = useState(original?.width || 1920)
  const [height, setHeight] = useState(original?.height || 1280)
  const [keepShape, setKeepShape] = useState(true)
  const [state, setState] = useState<'idle' | 'busy' | Error>('idle')
  const shapeLocked = keepShape && !!ratio
  const customHeight = shapeLocked ? Math.max(1, Math.round(width * ratio)) : height

  const size: DownloadSize = choice === 'custom' ? { width, height: shapeLocked ? undefined : height } : { size: choice }

  const save = async () => {
    setState('busy')

    try {
      await ApiDownload.photo(photo.id, size, owned).saveToPhotos()

      onClose()
      toast.show('Saved to your photos.')
    } catch (problem) {
      setState(problem instanceof Error ? problem : new Error("We couldn't save the photo."))
    }
  }

  return (
    <Sheet title="Choose a size" onClose={onClose}>
      <View style={styles.options} accessibilityRole="radiogroup">
        {photo.downloads.map((option) => (
          <SizeOption key={option.size} label={LABELS[option.size]} detail={option.width && option.height ? `${option.width} × ${option.height}` : 'Full size'} selected={choice === option.size} onPress={() => setChoice(option.size)} />
        ))}
        {ratio && <SizeOption label="Custom size" detail="Your own width and height" selected={choice === 'custom'} onPress={() => setChoice('custom')} />}
      </View>

      {choice === 'custom' && (
        <View style={styles.custom}>
          <View style={styles.dimensions}>
            <Dimension label="Width" value={width} max={original?.width} onChange={setWidth} />
            <Text style={styles.times}>×</Text>
            <Dimension label="Height" value={customHeight} max={original?.height} onChange={setHeight} disabled={shapeLocked} />
          </View>
          <CheckOption
            label="Keep the photo's shape"
            description={`${keepShape ? 'The height follows the width.' : 'The photo is cropped from the centre to this size.'} Photos are never made larger than the original.`}
            checked={keepShape}
            onPress={() => setKeepShape(!keepShape)}
          />
        </View>
      )}

      {state instanceof Error ? <Callout>{state.message}</Callout> : null}
      <Button title={state === 'busy' ? 'Saving…' : 'Save to your photos'} size="lg" loading={state === 'busy'} onPress={save} />
    </Sheet>
  )
}

function SizeOption({ label, detail, selected, onPress }: { label: string; detail: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.option, selected && styles.chosen]}>
      <View style={styles.optionLabel}>
        <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text variant="muted">{detail}</Text>
    </Pressable>
  )
}

function Dimension({ label, value, max, onChange, disabled }: { label: string; value: number; max?: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <View style={styles.flex}>
      <Field label={label}>
        <Input
          value={String(value)}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={max ? String(max).length : 5}
          onChangeText={(text) => onChange(Math.max(1, Math.round(Number(text.replace(/\D/g, ''))) || 1))}
          style={disabled && styles.disabled}
        />
      </Field>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.surface300 },
  chosen: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  optionLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.surface300, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.brand600 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand600 },
  label: { fontFamily: fonts.semibold, color: colors.ink900 },
  custom: { gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  dimensions: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  times: { paddingBottom: 14, color: colors.ink500 },
  disabled: { opacity: 0.6 },
})
