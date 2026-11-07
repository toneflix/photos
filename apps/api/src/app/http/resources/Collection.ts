import { ResourceCollection } from 'resora'

/**
 * A collection that maps a page of Arkorm results through `collects`.
 * It unwraps the paginator's collection to a plain array so resources with
 * async `data()` are awaited before the response is sent, and an error thrown
 * by one reaches the error handler.
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

  /** Hands errors thrown while building the body to the request's error handler. */
  override then<T = unknown, E = never>(onfulfilled?: ((value: any) => T | PromiseLike<T>) | null, onrejected?: ((reason: any) => E | PromiseLike<E>) | null) {
    return super.then(onfulfilled, onrejected).catch((error: unknown) => (onrejected ? onrejected(error) : Promise.reject(error)))
  }
}
