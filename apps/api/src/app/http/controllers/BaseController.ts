import { RulesForData, Validator } from 'kanun'

import { Controller } from 'clear-router'
import { HttpContext } from 'clear-router/types/express'
import type { PaginationMeta } from '@photos/types'
import { RequestException } from '@arkstack/common'
import type { User } from '@app/models/User'

export class BaseController extends Controller<HttpContext> {
  async validate<D extends Record<string, any>, R extends RulesForData<D>>(rules: R, camelizeKeys = false) {
    const data = await Validator.make(this.body, rules).validate()

    if (camelizeKeys) {
      return Object.keys(data).reduce(
        (result, key) => {
          result[str(key).camel().toString()] = data[key as never]

          return result
        },
        {} as Record<string, any>,
      ) as { [K in keyof R]: any }
    }

    return data as { [K in keyof R]: any }
  }

  /** The signed-in user. Only call this behind the `auth` middleware. */
  protected get user(): User {
    return (this.ctx.req as any).user as User
  }

  /** Send a `{ data, status, message, code }` envelope. */
  protected respond<T>(data: T, message = 'OK', code = 200) {
    this.ctx.res.status(code).json({ data, status: 'success', message, code })
  }

  /** Send a paginated envelope matching resora's `{ data, meta, links }` shape. */
  protected respondPaginated<T>(data: T[], total: number, page: number, perPage: number) {
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const base = `${env('APP_URL', 'http://localhost')}${this.ctx.req.baseUrl}${this.ctx.req.path}`
    const link = (p: number) => `${base}?page=${p}&per_page=${perPage}`
    const from = total === 0 ? null : (page - 1) * perPage + 1
    const links = {
      first: link(1),
      last: link(lastPage),
      prev: page > 1 ? link(page - 1) : null,
      next: page < lastPage ? link(page + 1) : null,
    }
    const meta: PaginationMeta = {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
      from,
      to: from == null ? null : Math.min(total, from + data.length - 1),
      path: base,
    }

    this.ctx.res.status(200).json({ data, meta, links, status: 'success', message: 'OK', code: 200 })
  }

  /** Read `page` / `per_page` from the query string, with sane bounds. */
  protected pagination(defaultPerPage = 30, maxPerPage = 100) {
    const page = Math.max(1, Number.parseInt(String(this.query.page ?? '1'), 10) || 1)
    const perPage = Math.min(
      maxPerPage,
      Math.max(1, Number.parseInt(String(this.query.per_page ?? defaultPerPage), 10) || defaultPerPage),
    )

    return { page, perPage }
  }

  protected notFound(what = 'Resource'): never {
    throw new RequestException(`${what} not found`, 404)
  }
}
