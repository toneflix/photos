import { StyleSheet, View } from 'react-native'
import type { BookBrandingInput, BookWithPages } from '@photos/types'
import { Field, Input, Text } from '@/components/ui'

export const DEFAULT_KICKER = 'A Toneflix photo book'

const BRANDING_FIELDS: { key: keyof BookBrandingInput; label: string; placeholder: string; hint: string }[] = [
  { key: 'kicker', label: 'Cover line', placeholder: DEFAULT_KICKER, hint: 'Small capitals above the title on the cover.' },
  { key: 'brand', label: 'Your brand', placeholder: 'Ada Studio', hint: 'Printed on the back cover, above the imprint.' },
  { key: 'imprint', label: 'Back cover name', placeholder: 'Toneflix Photos', hint: 'Printed on the back cover in place of Toneflix Photos.' },
]

/** Branding fields that changed and the plan allows, so a save never sends text the plan would refuse. */
export function brandingChanges(book: BookWithPages, branding: BookBrandingInput): Partial<BookBrandingInput> {
  return Object.fromEntries(
    BRANDING_FIELDS.filter(({ key }) => book.brandingAllowed?.[key] && (branding[key]?.trim() || null) !== (book.customBranding?.[key] ?? null)).map(({ key }) => [
      key,
      branding[key]?.trim() || null,
    ]),
  )
}

/** The maker's cover line, brand and back cover name. Fields the plan doesn't include are shown locked. */
export function BrandingFields({
  allowed,
  value,
  onChange,
}: {
  allowed?: Record<keyof BookBrandingInput, boolean>
  value: BookBrandingInput
  onChange: (value: BookBrandingInput) => void
}) {
  return (
    <View style={styles.group}>
      <Text variant="label">Branding</Text>
      {BRANDING_FIELDS.map(({ key, label, placeholder, hint }) => (
        <Field key={key} label={label} hint={allowed?.[key] ? hint : `${hint} Included with Premium.`}>
          <Input
            value={value[key] ?? ''}
            onChangeText={(text) => onChange({ ...value, [key]: text })}
            placeholder={placeholder}
            maxLength={60}
            editable={!!allowed?.[key]}
            style={!allowed?.[key] && styles.locked}
          />
        </Field>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: 14 },
  locked: { opacity: 0.6 },
})
