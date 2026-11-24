import { useState } from 'react'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PAGE_SHAPES, pageAspect, type PageShape } from '@photos/types'
import { Field, Text } from '@/components/ui'
import { webUrl } from '@/lib/links'
import { colors, fonts, radius } from '@/theme'

const SHAPES = Object.keys(PAGE_SHAPES) as PageShape[]

/** Radio cards for the book's page shape, each drawn at its proportions. Shapes outside `allowed` carry a star. */
export function ShapePicker({ value, allowed, onChange }: { value: PageShape; allowed?: PageShape[]; onChange: (shape: PageShape) => void }) {
  const [asked, setAsked] = useState<PageShape | null>(null)

  return (
    <Field label="Page shape">
      <View style={styles.row} accessibilityRole="radiogroup">
        {SHAPES.map((shape) => {
          const on = value === shape
          const premium = !!allowed && !allowed.includes(shape)
          const aspect = pageAspect(shape)
          const size = aspect < 1 ? { height: 40, width: 40 * aspect } : { width: Math.min(48, 36 * aspect), height: Math.min(48, 36 * aspect) / aspect }

          return (
            <Pressable
              key={shape}
              onPress={() => {
                setAsked(premium ? shape : null)

                if (!premium) onChange(shape)
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: premium }}
              accessibilityLabel={premium ? `${PAGE_SHAPES[shape].label}, not in your plan` : PAGE_SHAPES[shape].label}
              style={[styles.card, on && styles.cardOn]}
            >
              <View style={styles.frame}>
                <View style={[styles.page, size, premium && styles.pagePremium, on && styles.pageOn]}>
                  {premium && (
                    <View style={styles.mark}>
                      <Ionicons name="star" size={9} color={colors.ink900} />
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.label, on && styles.labelOn]}>{PAGE_SHAPES[shape].label}</Text>
              <Text style={styles.ratio}>{PAGE_SHAPES[shape].ratio}</Text>
            </Pressable>
          )
        })}
      </View>
      {asked ? (
        <Text style={styles.hint}>
          {PAGE_SHAPES[asked].label} pages aren't included in your plan.{' '}
          <Text style={styles.hintLink} onPress={() => Linking.openURL(webUrl('/pricing')).catch(() => undefined)}>
            See plans
          </Text>
        </Text>
      ) : (
        <Text variant="muted" style={styles.note}>
          The cover and every page take this shape.
        </Text>
      )}
    </Field>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  card: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 12, paddingBottom: 8, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.surface200, backgroundColor: colors.white },
  cardOn: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  frame: { height: 40, justifyContent: 'flex-end', marginBottom: 2 },
  page: { borderRadius: 3, borderWidth: 2, borderColor: colors.surface300, backgroundColor: colors.surface100 },
  pagePremium: { borderColor: colors.gold300, backgroundColor: colors.gold50 },
  pageOn: { borderColor: colors.brand600, backgroundColor: colors.white },
  mark: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold400,
  },
  label: { fontSize: 12, color: colors.ink700 },
  labelOn: { fontFamily: fonts.semibold, color: colors.brand700 },
  ratio: { fontSize: 11, color: colors.ink500 },
  hint: { marginTop: 8, fontSize: 12, color: colors.ink700 },
  hintLink: { fontSize: 12, fontFamily: fonts.semibold, color: colors.brand700 },
  note: { marginTop: 8, fontSize: 13 },
})
