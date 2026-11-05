import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { OptionSheet, Text } from '@/components/ui'
import type { FilterField, FilterValues } from '@/lib/filters'
import { colors, fonts, radius } from '@/theme'

/** A search box with a row of filter chips. Changing a filter searches straight away. */
export function SearchFilters({
  placeholder,
  filters,
  values,
  onChange,
}: {
  placeholder: string
  filters: FilterField[]
  values: FilterValues
  onChange: (name: string, value: string) => void
}) {
  const [text, setText] = useState(values.q ?? '')
  const [open, setOpen] = useState<FilterField | null>(null)

  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.ink500} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => onChange('q', text.trim().slice(0, 100))}
          onBlur={() => onChange('q', text.trim().slice(0, 100))}
          placeholder={placeholder}
          placeholderTextColor={colors.ink500}
          returnKeyType="search"
          maxLength={100}
          style={styles.input}
          accessibilityRole="search"
        />
        {text ? (
          <Pressable
            accessibilityLabel="Clear search"
            hitSlop={8}
            onPress={() => {
              setText('')
              onChange('q', '')
            }}
          >
            <Ionicons name="close-circle" size={18} color={colors.ink500} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {filters.map((field) => {
          const value = values[field.name] ?? ''
          const current = field.options.find((option) => option.value === value) ?? field.options[0]

          return (
            <Pressable
              key={field.name}
              accessibilityRole="button"
              accessibilityLabel={`${field.label}: ${current.label}`}
              onPress={() => setOpen(field)}
              style={[styles.chip, value ? styles.chipOn : null]}
            >
              <Text style={[styles.chipText, value ? styles.chipTextOn : null]}>{current.label}</Text>
              <Ionicons name="chevron-down" size={14} color={value ? colors.white : colors.ink700} />
            </Pressable>
          )
        })}
      </ScrollView>
      {open && (
        <OptionSheet
          visible
          title={open.label}
          options={open.options}
          value={values[open.name] ?? ''}
          onSelect={(value) => onChange(open.name, value)}
          onClose={() => setOpen(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surface300,
    backgroundColor: colors.surface100,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink900, height: '100%' },
  chips: { gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surface300,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.ink900, borderColor: colors.ink900 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink700 },
  chipTextOn: { color: colors.white },
})
