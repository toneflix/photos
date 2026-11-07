import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { putOnPlan, seedPlans } from './support/plans'
import request from 'parasito'

const tokens = { free: '', paid: '' }
const emails = { free: `brand-free-${Date.now()}@toneflix.test`, paid: `brand-paid-${Date.now()}@toneflix.test` }

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as?: keyof typeof tokens, code?: string) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as) call.set('Authorization', `Bearer ${tokens[as]}`)
  if (code) call.set('X-Access-Code', code)

  return body ? call.send(body) : call
}

const TONEFLIX = { kicker: 'A Toneflix photo book', brand: null, imprint: 'Toneflix Photos', colophon: 'Made with Toneflix Photos.' }

describe('Book branding', () => {
  let freeBook = ''
  let paidBook = ''

  beforeAll(async () => {
    seedPlans()

    for (const who of ['free', 'paid'] as const) {
      const register = await api('post', '/auth/register', { name: `Brand ${who}`, email: emails[who], password: 'password123' })

      tokens[who] = register.body.data.token
    }

    putOnPlan(emails.paid)

    freeBook = (await api('post', '/books', { title: 'Free', visibility: 'shared' }, 'free')).body.data.id
    paidBook = (await api('post', '/books', { title: 'Paid', visibility: 'shared' }, 'paid')).body.data.id
  }, 30_000)

  it('prints the Toneflix cover line and back cover by default', async () => {
    const book = await api('get', `/books/${freeBook}`, undefined, 'free')

    expect(book.body.data.branding).toEqual(TONEFLIX)
    expect(book.body.data.brandingAllowed).toEqual({ kicker: false, brand: false, imprint: false })
  })

  it('refuses branding the plan does not include', async () => {
    const res = await api('put', `/books/${freeBook}`, { kicker: 'A wedding album', brand: 'Ada Studio' }, 'free')

    expect(res.status).toBe(422)
    expect(res.body.errors.kicker[0]).toContain('Your own cover line is not included in your plan.')
  })

  it('prints the owner branding on premium plans', async () => {
    const brand = await api('put', `/books/${paidBook}`, { kicker: 'A wedding album', brand: 'Ada Studio' }, 'paid')
    const shown = await api('get', `/books/${paidBook}`)

    expect(brand.status).toBe(200)
    expect(brand.body.data.customBranding).toEqual({ kicker: 'A wedding album', brand: 'Ada Studio', imprint: null })
    expect(shown.body.data.branding).toEqual({ ...TONEFLIX, kicker: 'A wedding album', brand: 'Ada Studio' })
    expect(shown.body.data.customBranding).toBeUndefined()

    const imprint = await api('put', `/books/${paidBook}`, { imprint: 'Ada Studio Books' }, 'paid')

    expect(imprint.body.data.branding).toEqual({ kicker: 'A wedding album', brand: 'Ada Studio', imprint: 'Ada Studio Books', colophon: null })
  })

  it('keeps branding to the person who made the book', async () => {
    const code = (await api('post', `/books/${paidBook}/access-codes`, { permissions: ['edit'] }, 'paid')).body.data.code
    const res = await api('put', `/books/${paidBook}`, { brand: 'Someone else' }, undefined, code)

    expect(res.status).toBe(403)
  })

  it('keeps the maker branding when a client claims the book', async () => {
    const book = (await api('post', '/books', { title: 'Handed over', brand: 'Ada Studio', imprint: 'Ada Studio Books' }, 'paid')).body.data.id
    const transfer = (await api('post', `/books/${book}/access-codes`, { permissions: ['transfer'] }, 'paid')).body.data.code

    expect((await api('post', '/access-codes/claim', { code: transfer }, 'free')).status).toBe(200)

    const claimed = await api('get', `/books/${book}`, undefined, 'free')
    const rebrand = await api('put', `/books/${book}`, { brand: 'Client brand' }, 'free')
    const restyle = await api('put', `/books/${book}`, { title: 'Our copy', theme: 'sage' }, 'free')

    expect(claimed.body.data.isOwner).toBe(true)
    expect(claimed.body.data.branding).toMatchObject({ brand: 'Ada Studio', imprint: 'Ada Studio Books', colophon: null })
    expect(claimed.body.data.customBranding).toBeUndefined()
    expect(rebrand.status).toBe(403)
    expect(restyle.status).toBe(200)
  })

  it('goes back to Toneflix branding when the plan ends, keeping the saved text', async () => {
    putOnPlan(emails.paid, 'free')

    const shown = await api('get', `/books/${paidBook}`, undefined, 'paid')

    expect(shown.body.data.branding).toEqual(TONEFLIX)
    expect(shown.body.data.customBranding).toEqual({ kicker: 'A wedding album', brand: 'Ada Studio', imprint: 'Ada Studio Books' })
    expect((await api('put', `/books/${paidBook}`, { title: 'Renamed', brand: 'Ada Studio' }, 'paid')).status).toBe(200)
    expect((await api('put', `/books/${paidBook}`, { brand: null }, 'paid')).status).toBe(200)
  })
})
