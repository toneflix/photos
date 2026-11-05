import { ResourceCollection } from 'resora'

/**
 * A collection that maps a page of Arkorm results through `collects`.
 * It unwraps the paginator's collection to a plain array so resources with
 * async `data()` are awaited before the response is sent.
 */
export class Collection extends ResourceCollection {
  data(ctx?: unknown) {
    const source = this.resource as any
    const items: any[] = Array.isArray(source)
      ? source
      : typeof source?.all === 'function'
        ? source.all()
        : typeof source?.data?.all === 'function'
          ? source.data.all()
          : (source?.data ?? [])

    const Item = this.collects

    return Item ? items.map((item) => new Item(item).data(ctx)) : items
  }
}
