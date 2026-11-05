import { BookResource } from './BookResource'
import { Collection } from './Collection'

export class BookCollection extends Collection {
  collects = BookResource
}
