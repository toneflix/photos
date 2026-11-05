import { useEffect, useState } from 'react'
import type { Space } from '@photos/types'
import type { Option } from '@/components/ui'

export interface FilterField {
  name: string
  label: string
  options: Option[]
}

export const ORIENTATION_FILTER: FilterField = {
  name: 'orientation',
  label: 'Shape',
  options: [
    { value: '', label: 'Any shape' },
    { value: 'landscape', label: 'Landscape' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'square', label: 'Square' },
  ],
}

export const THEME_FILTER: FilterField = {
  name: 'theme',
  label: 'Cover',
  options: [
    { value: '', label: 'Any cover' },
    { value: 'classic', label: 'Classic leather' },
    { value: 'linen', label: 'Linen' },
    { value: 'midnight', label: 'Midnight' },
  ],
}

export const SORT_FILTER: FilterField = {
  name: 'sort',
  label: 'Order',
  options: [
    { value: '', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
  ],
}

export const PHOTO_VISIBILITY_FILTER: FilterField = {
  name: 'visibility',
  label: 'Visibility',
  options: [
    { value: '', label: 'All photos' },
    { value: 'private', label: 'Private' },
    { value: 'public', label: 'On Explore' },
  ],
}

export const BOOK_VISIBILITY_FILTER: FilterField = {
  name: 'visibility',
  label: 'Visibility',
  options: [
    { value: '', label: 'All books' },
    { value: 'private', label: 'Private' },
    { value: 'shared', label: 'Shared by link' },
    { value: 'public', label: 'Public' },
  ],
}

/** Narrow your library to one of your spaces. */
export function spaceFilter(spaces: Space[]): FilterField {
  return {
    name: 'space',
    label: 'Space',
    options: [{ value: '', label: 'All spaces' }, ...spaces.map((space) => ({ value: space.id, label: space.name }))],
  }
}

export type FilterValues = Record<string, string>

/**
 * Search text plus filter values. Empty values mean "any" and are left out of the query.
 * `seed` sets values from outside, such as a link that opens the library on one space.
 */
export function useFilters(seed: FilterValues = {}) {
  const [values, setValues] = useState<FilterValues>(seed)
  const seedKey = JSON.stringify(seed)

  useEffect(() => {
    setValues((current) => ({ ...current, ...JSON.parse(seedKey) }))
  }, [seedKey])
  const query = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim())) as FilterValues

  return {
    values,
    query,
    /** A stable key for watching: changes whenever the query does. */
    key: JSON.stringify(query),
    active: Object.keys(query).length > 0,
    set: (name: string, value: string) => setValues((current) => ({ ...current, [name]: value })),
  }
}
