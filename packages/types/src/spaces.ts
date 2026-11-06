import type { SpacePermission } from './models'

export interface SpacePermissionInfo {
  value: SpacePermission
  label: string
  /** What a member with it may do, in one sentence. */
  summary: string
}

/** The permissions a space owner can give the people they invite, in the order pickers show them. */
export const SPACE_PERMISSIONS: SpacePermissionInfo[] = [
  { value: 'view', label: 'View', summary: 'Open the space and see its photos and books, even while it is private.' },
  { value: 'create', label: 'Add work', summary: 'Add their own photos and books to the space.' },
  { value: 'edit', label: 'Edit books', summary: 'Change the pages of every book in the space and add photos to them.' },
  { value: 'manage', label: 'Manage', summary: 'Rename the space and invite, change or remove members.' },
]

/** "View, Add work" for a member's permissions. */
export function spacePermissionLabels(permissions: SpacePermission[]): string {
  return SPACE_PERMISSIONS.filter((permission) => permissions.includes(permission.value))
    .map((permission) => permission.label)
    .join(', ')
}
