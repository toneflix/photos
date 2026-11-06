import { useRequest } from 'alova/client'
import type { SharedSpace, Space } from '@photos/types'
import type { Option } from '@/components/ui'
import { api } from './api'

/** The spaces you can put work in, for filters and pickers: your own, then the shared ones that let you add. */
export function useSpaces() {
  const { data: owned } = useRequest(() => api.spaces.list({ per_page: 100 }))
  const { data: shared } = useRequest(() => api.spaces.shared({ per_page: 100 }))
  const joined = ((shared?.data ?? []) as SharedSpace[]).filter((space) => space.permissions.includes('create'))

  return [...((owned?.data ?? []) as Space[]), ...joined]
}

/** Options for choosing a space, or none. */
export const spaceOptions = (spaces: Space[]): Option[] => [
  { value: '', label: 'No space' },
  ...spaces.map((space) => ({ value: space.id, label: space.visibility === 'private' ? `${space.name} (private)` : space.name })),
]
