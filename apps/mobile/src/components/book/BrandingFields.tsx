import { StyleSheet, View } from 'react-native'
import type { AppLimits, BookBrandingInput, BookWithPages } from '@photos/types'
import { Field, Input, Text } from '@/components/ui'
import { useLimits } from '@/lib/limits'

const BRANDING_KEYS = ['kicker', 'brand', 'imprint'] as const

/** The branding inputs, with the defaults admins set as placeholders. */
function brandingFields({ bookKicker, bookImprint }: AppLimits): { key: keyof BookBrandingInput; label: string; placeholder: string; hint: string }[] {
  return [
    { key: 'kicker', label: 'Cover line', placeholder: bookKicker, hint: 'Small capitals above the title on the cover.' },
    { key: 'brand', label: 'Your brand', placeholder: 'Ada Studio', hint: 'Printed on the back cover, above the imprint.' },
    { key: 'imprint', label: 'Back cover name', placeholder: bookImprint, hint: `Printed on the back cover in place of ${bookImprint}.` },
  ]
}

/** Branding fields that changed and the plan allows, so a save never sends text the plan would refuse. */
export function brandingChanges(book: BookWithPages, branding: BookBrandingInput): Partial<BookBrandingInput> {
  return Object.fromEntries(
    BRANDING_KEYS.filter((key) => book.brandingAllowed?.[key] && (branding[key]?.trim() || null) !== (book.customBranding?.[key] ?? null)).map((key) => [
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
  const fields = brandingFields(useLimits())

  return (
    <View style={styles.group}>
      <Text variant="label">Branding</Text>
      {fields.map(({ key, label, placeholder, hint }) => (
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
