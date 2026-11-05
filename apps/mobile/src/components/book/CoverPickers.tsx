import { Pressable, StyleSheet, Switch, View } from 'react-native'
import { COVER_DESIGNS, COVER_THEMES, coverHasText, type BookTheme, type CoverDesign } from '@photos/types'
import { BookCover, type CoverLook } from '@/components/BookCover'
import { Field, Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

const CLOTHS = Object.keys(COVER_THEMES) as BookTheme[]
const DESIGNS = Object.keys(COVER_DESIGNS) as CoverDesign[]

/** Radio chips for the cover cloth, each with a swatch of the cloth and its ink. */
export function ClothPicker({ value, onChange }: { value: BookTheme; onChange: (theme: BookTheme) => void }) {
  return (
    <Field label="Cloth">
      <View style={styles.chips}>
        {CLOTHS.map((theme) => (
          <Pressable
            key={theme}
            onPress={() => onChange(theme)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === theme }}
            style={[styles.chip, value === theme && styles.chipOn]}
          >
            <View style={[styles.swatch, { backgroundColor: COVER_THEMES[theme].cloth, borderColor: COVER_THEMES[theme].ink }]} />
            <Text style={[styles.chipText, value === theme && styles.chipTextOn]}>{COVER_THEMES[theme].label}</Text>
          </Pressable>
        ))}
      </View>
    </Field>
  )
}

/** Every cover design as a small cover of this book. */
export function CoverDesignPicker({ book, onChange }: { book: CoverLook & { coverDesign: CoverDesign }; onChange: (design: CoverDesign) => void }) {
  return (
    <Field label="Cover design">
      <View style={styles.grid}>
        {DESIGNS.map((design) => {
          const checked = book.coverDesign === design

          return (
            <Pressable key={design} onPress={() => onChange(design)} accessibilityRole="radio" accessibilityLabel={COVER_DESIGNS[design].label} accessibilityState={{ checked }} style={styles.design}>
              <View style={[styles.ring, checked && styles.ringOn]}>
                <View style={styles.cover}>
                  <BookCover book={{ ...book, coverDesign: design, coverText: checked ? book.coverText : null }} />
                </View>
              </View>
              <Text style={[styles.designLabel, checked && styles.designLabelOn]}>{COVER_DESIGNS[design].label}</Text>
            </Pressable>
          )
        })}
      </View>
      <Text variant="muted" style={styles.note}>
        {COVER_DESIGNS[book.coverDesign].description}.
      </Text>
    </Field>
  )
}

/**
 * Whether the title prints on the cover. Null follows the design's own default, so the switch only
 * stores a choice that differs from it.
 */
export function CoverTextSwitch({ design, value, onChange }: { design: CoverDesign; value: boolean | null; onChange: (coverText: boolean | null) => void }) {
  const fallback = coverHasText({ coverDesign: design })
  const printed = value ?? fallback

  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>Print the title on the cover</Text>
      <Switch
        value={printed}
        onValueChange={(next) => onChange(next === fallback ? null : next)}
        trackColor={{ true: colors.ink900, false: colors.surface300 }}
        accessibilityLabel="Print the title on the cover"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface300 },
  chipOn: { borderColor: colors.ink900, backgroundColor: colors.ink900 },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  chipText: { fontSize: 14, fontFamily: fonts.medium, color: colors.ink700 },
  chipTextOn: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 },
  design: { width: '33.333%', paddingHorizontal: 6, alignItems: 'center', gap: 6 },
  ring: { width: '100%', padding: 2, borderRadius: 6, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.brand500 },
  cover: { width: '100%', aspectRatio: 3 / 4, borderTopRightRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden' },
  designLabel: { fontSize: 12, lineHeight: 15, color: colors.ink500, textAlign: 'center' },
  designLabelOn: { fontFamily: fonts.medium, color: colors.ink900 },
  note: { marginTop: 8, fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, color: colors.ink700 },
})
