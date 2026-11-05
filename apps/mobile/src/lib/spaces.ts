import { useRequest } from 'alova/client'
import type { Space } from '@photos/types'
import type { Option } from '@/components/ui'
import { api } from './api'

/** Your spaces, for filters and pickers. */
export function useSpaces() {
  const { data } = useRequest(() => api.spaces.list({ per_page: 100 }))

  return (data?.data ?? []) as Space[]
}

/** Options for choosing a space, or none. */
export const spaceOptions = (spaces: Space[]): Option[] => [
  { value: '', label: 'No space' },
  ...spaces.map((space) => ({ value: space.id, label: space.visibility === 'private' ? `${space.name} (private)` : space.name })),
]
