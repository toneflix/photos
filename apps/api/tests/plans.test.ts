import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { putOnPlan, seedPlans } from './support/plans'
import request from 'parasito'
import sharp from 'sharp'

const tokens = { free: '', paid: '' }
const emails = { free: `plans-free-${Date.now()}@toneflix.test`, paid: `plans-paid-${Date.now()}@toneflix.test` }

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as?: keyof typeof tokens) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const upload = async (as: keyof typeof tokens) => {
  const image = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#0064d6' } })
    .png()
    .toBuffer()
  const form = new FormData()

  form.append('photo', new Blob([image], { type: 'image/png' }), 'wide.png')

  return (await request(app).post('/api/photos').set({ Accept: 'application/json', Authorization: `Bearer ${tokens[as]}` }).send(form)).body.data.id as string
}

describe('Plans', () => {
  let freeBook = ''
  let photo = ''

  beforeAll(async () => {
    seedPlans()

    for (const who of ['free', 'paid'] as const) {
      const register = await api('post', '/auth/register', { name: `Plan ${who}`, email: emails[who], password: 'password123' })

      tokens[who] = register.body.data.token
    }

    putOnPlan(emails.paid)

    freeBook = (await api('post', '/books', { title: 'Free book' }, 'free')).body.data.id
    photo = await upload('free')
  }, 30_000)

  it('lists the plans on offer with the features they show', async () => {
    const res = await api('get', '/plans')
    const slugs = res.body.data.map((plan: { slug: string }) => plan.slug)
    const premium = res.body.data.find((plan: { slug: string }) => plan.slug === 'premium')

    expect(res.status).toBe(200)
    expect(slugs.slice(0, 2)).toEqual(['free', 'premium'])
    expect(premium.billing).toEqual([
      { cycles: 1, discount: 0, price: premium.price, saved: 0, charge: premium.price },
      expect.objectContaining({ cycles: 12, discount: 20 }),
    ])
    expect(premium.features).toContainEqual(expect.objectContaining({ key: 'book_zip', value: true }))
  })

  it('shows each account its plan, features and usage', async () => {
    const free = await api('get', '/account/plan', undefined, 'free')
    const paid = await api('get', '/account/plan', undefined, 'paid')

    expect(free.body.data).toMatchObject({ premium: false, endsAt: null, plan: { slug: 'free' }, features: { max_books: 5, book_zip: false }, usage: { books: 1 } })
    expect(free.body.data.usage.storage.used).toBeGreaterThan(0)
    expect(free.body.data.usage.storage.limit).toBe(1024 * 1024 * 1024)
    expect(paid.body.data).toMatchObject({ premium: true, plan: { slug: 'premium' }, features: { max_books: 0, book_zip: true } })
    expect(new Date(paid.body.data.endsAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('gives signed-in apps the limits of their plan', async () => {
    const visitor = await api('get', '/limits')
    const paid = await api('get', '/limits', undefined, 'paid')

    expect(visitor.body.data.maxPhotoMb).toBe(25)
    expect(paid.body.data).toMatchObject({ maxPhotoMb: 50, maxBookPages: 200 })
  })

  it('keeps free accounts to their number of books', async () => {
    for (let n = 2; n <= 5; n++) expect((await api('post', '/books', { title: `Book ${n}` }, 'free')).status).toBe(201)

    const sixth = await api('post', '/books', { title: 'One too many' }, 'free')

    expect(sixth.status).toBe(422)
    expect(sixth.body.errors.title[0]).toBe('Your plan allows 5 books. Upgrade your plan for more.')
  })

  it('keeps premium covers and layouts to plans that include them', async () => {
    const cover = await api('put', `/books/${freeBook}`, { coverDesign: 'gilt' }, 'free')
    const layout = await api('put', `/books/${freeBook}/pages`, { pages: [{ layout: 'mosaic', photoIds: [photo] }] }, 'free')
    const plain = await api('put', `/books/${freeBook}/pages`, { pages: [{ layout: 'pair', photoIds: [photo] }] }, 'free')
    const paid = await api('post', '/books', { title: 'Gilt book', coverDesign: 'gilt' }, 'paid')

    expect(cover.status).toBe(422)
    expect(cover.body.errors.coverDesign[0]).toContain('not included in your plan')
    expect(layout.status).toBe(422)
    expect(plain.status).toBe(200)
    expect(paid.status).toBe(201)
  })

  it('keeps free spaces private and one to an account', async () => {
    const publicSpace = await api('post', '/spaces', { name: 'Open studio', visibility: 'public' }, 'free')
    const first = await api('post', '/spaces', { name: 'Studio' }, 'free')
    const second = await api('post', '/spaces', { name: 'Second studio' }, 'free')
    const goPublic = await api('put', `/spaces/${first.body.data.id}`, { visibility: 'public' }, 'free')

    expect(publicSpace.status).toBe(422)
    expect(first.status).toBe(201)
    expect(second.status).toBe(422)
    expect(goPublic.status).toBe(422)
    expect(goPublic.body.errors.visibility[0]).toContain('Public spaces')
  })

  it('gives free books one access code without the client hand-off', async () => {
    const transfer = await api('post', `/books/${freeBook}/access-codes`, { permissions: ['transfer'] }, 'free')
    const first = await api('post', `/books/${freeBook}/access-codes`, { label: 'Guests' }, 'free')
    const second = await api('post', `/books/${freeBook}/access-codes`, { label: 'Family' }, 'free')

    expect(transfer.status).toBe(422)
    expect(first.status).toBe(201)
    expect(second.status).toBe(422)
  })

  it('keeps book zips and full-size downloads to plans that include them', async () => {
    const zip = await api('get', `/books/${freeBook}/download`, undefined, 'free')
    const original = await api('get', `/photos/${photo}/download`, undefined, 'free')
    const huge = await api('get', `/photos/${photo}/download?width=2400`, undefined, 'free')
    const large = await api('get', `/photos/${photo}/download?size=large`, undefined, 'free')

    expect(zip.status).toBe(403)
    expect(zip.body.message).toBe('Book downloads are not included in your plan.')
    expect(original.status).toBe(403)
    expect(huge.status).toBe(403)
    expect(large.status).toBe(200)
  })

  it('keeps what a book already uses after the plan ends', async () => {
    const book = (await api('post', '/books', { title: 'Kept cover', coverDesign: 'deco' }, 'paid')).body.data.id

    putOnPlan(emails.paid, 'free')

    const rename = await api('put', `/books/${book}`, { title: 'Still deco', coverDesign: 'deco' }, 'paid')
    const plan = await api('get', '/account/plan', undefined, 'paid')

    expect(rename.status).toBe(200)
    expect(rename.body.data.coverDesign).toBe('deco')
    expect(plan.body.data).toMatchObject({ premium: false, plan: { slug: 'free' } })
  })
})
