import { accessAction, actionDelegationMiddleware } from 'alova/client'
import type { Book, Photo, Space } from '@photos/types'

/**
 * Keeps every paginated list of one kind in step when an item changes on another screen,
 * through alova's action delegation.
 */
export class SharedList<T extends { id: string }> {
  constructor(private readonly id: string) {}

  /** Pass to `usePagination({ middleware })` so the list joins this group. */
  get middleware() {
    return actionDelegationMiddleware(this.id)
  }

  replace(item: T) {
    accessAction(
      this.id,
      (list) => {
        const index = (list.getState('data') as T[]).findIndex((entry) => entry.id === item.id)

        if (index >= 0) list.replace(item, index)
      },
      true,
    )
  }

  remove(id: string) {
    accessAction(
      this.id,
      (list) => {
        const index = (list.getState('data') as T[]).findIndex((entry) => entry.id === id)

        if (index >= 0) list.remove(index)
      },
      true,
    )
  }

  reload() {
    accessAction(this.id, (list) => list.reload(), true)
  }
}

export const photoLists = new SharedList<Photo>('photo-lists')
export const bookLists = new SharedList<Book>('book-lists')
export const spaceLists = new SharedList<Space>('space-lists')
