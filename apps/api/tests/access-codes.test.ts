import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const tokens = { photographer: '', client: '' }

const api = (
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  body?: Record<string, unknown>,
  as?: keyof typeof tokens,
  code?: string,
) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as) call.set('Authorization', `Bearer ${tokens[as]}`)
  if (code) call.set('X-Access-Code', code)

  return body ? call.send(body) : call
}

const upload = (path: string, headers: Record<string, string>) => {
  const form = new FormData()

  form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')

  return request(app)
    .post(`/api${path}`)
    .set({ Accept: 'application/json', ...headers })
    .send(form)
}

describe('Book access codes', () => {
  let bookId = ''
  let photoId = ''

  beforeAll(async () => {
    for (const who of ['photographer', 'client'] as const) {
      const email = `codes-${who}-${Date.now()}@toneflix.test`
      const register = await api('post', '/auth/register', { name: `Ada ${who}`, email, password: 'password123' })

      tokens[who] = register.body.data.token
    }

    photoId = (await upload('/photos', { Authorization: `Bearer ${tokens.photographer}` })).body.data.id
    bookId = (await api('post', '/books', { title: 'Wedding day', visibility: 'private' }, 'photographer')).body.data.id

    await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'single', photoIds: [photoId] }] }, 'photographer')
    await api('put', `/books/${bookId}`, { coverPhotoId: photoId }, 'photographer')
  })

  it('keeps a private book locked without a code', async () => {
    const signedOut = await api('get', `/books/${bookId}`)
    const wrong = await api('get', `/books/${bookId}`, undefined, undefined, 'AAAA-AAAA')

    expect(signedOut.status).toBe(404)
    expect(wrong.status).toBe(404)
  })

  it('lets only the owner create codes, always with view', async () => {
    const stranger = await api('post', `/books/${bookId}/access-codes`, { label: 'Nope' }, 'client')
    const created = await api('post', `/books/${bookId}/access-codes`, { label: 'Family', permissions: ['edit'] }, 'photographer')

    expect(stranger.status).toBe(404)
    expect(created.status).toBe(201)
    expect(created.body.data.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(created.body.data.permissions).toEqual(['view', 'edit'])
    expect(created.body.data.shareUrl).toContain(`/books/${bookId}?code=`)
  })

  it('opens the book with a view code, typed in any case, and counts the visit', async () => {
    const created = await api('post', `/books/${bookId}/access-codes`, { label: 'Guests' }, 'photographer')
    const code = created.body.data.code as string

    const redeemed = await api('post', '/access-codes/redeem', { code: code.toLowerCase().replace('-', '') })

    expect(redeemed.status).toBe(200)
    expect(redeemed.body.data.book.id).toBe(bookId)
    expect(redeemed.body.data.permissions).toEqual(['view'])

    const opened = await api('get', `/books/${bookId}`, undefined, undefined, code)

    expect(opened.status).toBe(200)
    expect(opened.body.data.canEdit).toBe(false)
    expect(opened.body.data.permissions).toEqual(['view'])

    const edit = await api('put', `/books/${bookId}`, { title: 'Hacked' }, undefined, code)

    expect(edit.status).toBe(403)

    const list = await api('get', `/books/${bookId}/access-codes`, undefined, 'photographer')
    const listed = list.body.data.find((item: { code: string }) => item.code === code)

    expect(listed.uses).toBe(1)
    expect(listed.lastUsedAt).toBeTruthy()
  })

  it('lets an edit code change pages and details but not who can open the book', async () => {
    const code = (await api('post', `/books/${bookId}/access-codes`, { permissions: ['edit'] }, 'photographer')).body.data.code

    const renamed = await api('put', `/books/${bookId}`, { title: 'Our wedding' }, undefined, code)
    const opened = await api('put', `/books/${bookId}`, { visibility: 'public' }, undefined, code)
    const pages = await api(
      'put',
      `/books/${bookId}/pages`,
      { pages: [{ layout: 'text', caption: 'Hello' }, { layout: 'single', photoIds: [photoId] }] },
      undefined,
      code,
    )

    const moved = await api('put', `/books/${bookId}`, { spaceId: null }, undefined, code)

    expect(moved.status).toBe(403)
    expect(renamed.status).toBe(200)
    expect(renamed.body.data.title).toBe('Our wedding')
    expect(renamed.body.data.canEdit).toBe(true)
    expect(renamed.body.data.isOwner).toBe(false)
    expect(opened.status).toBe(403)
    expect(pages.status).toBe(200)
    expect(pages.body.data.pages).toHaveLength(2)
  })

  it('lets an add code upload photos onto new pages in the owner library', async () => {
    const view = (await api('post', `/books/${bookId}/access-codes`, {}, 'photographer')).body.data.code
    const add = (await api('post', `/books/${bookId}/access-codes`, { permissions: ['add'] }, 'photographer')).body.data.code

    const refused = await upload(`/books/${bookId}/photos`, { 'X-Access-Code': view })
    const added = await upload(`/books/${bookId}/photos`, { 'X-Access-Code': add })

    expect(refused.status).toBe(403)
    expect(added.status).toBe(201)

    const last = added.body.data.pages.at(-1)

    expect(last.photos[0].userId).toBe(added.body.data.userId)
  })

  it('edits and revokes a code', async () => {
    const created = await api('post', `/books/${bookId}/access-codes`, { label: 'Temp' }, 'photographer')
    const { id, code } = created.body.data

    const updated = await api('put', `/books/${bookId}/access-codes/${id}`, { label: 'Aunties', permissions: ['view', 'add'] }, 'photographer')

    expect(updated.body.data.label).toBe('Aunties')
    expect(updated.body.data.permissions).toEqual(['view', 'add'])

    const expired = await api('put', `/books/${bookId}/access-codes/${id}`, { expiresAt: '2020-01-01T00:00:00Z' }, 'photographer')

    expect(expired.body.data.expired).toBe(true)
    expect((await api('get', `/books/${bookId}`, undefined, undefined, code)).status).toBe(404)

    await api('delete', `/books/${bookId}/access-codes/${id}`, undefined, 'photographer')

    expect((await api('post', '/access-codes/redeem', { code })).status).toBe(404)
  })

  it('hands the book to whoever claims it with a transfer code', async () => {
    const space = (await api('post', '/spaces', { name: 'Weddings' }, 'photographer')).body.data

    expect((await api('put', `/books/${bookId}`, { spaceId: space.id }, 'photographer')).body.data.spaceId).toBe(space.id)

    const view = (await api('post', `/books/${bookId}/access-codes`, {}, 'photographer')).body.data.code
    const transfer = (await api('post', `/books/${bookId}/access-codes`, { permissions: ['transfer'] }, 'photographer')).body.data.code

    expect((await api('post', '/access-codes/claim', { code: view }, 'client')).status).toBe(403)
    expect((await api('post', '/access-codes/claim', { code: transfer })).status).toBe(401)
    expect((await api('post', '/access-codes/claim', { code: transfer }, 'photographer')).status).toBe(422)

    const claimed = await api('post', '/access-codes/claim', { code: transfer }, 'client')

    expect(claimed.status).toBe(200)
    expect(claimed.body.data.isOwner).toBe(true)
    expect(claimed.body.data.spaceId).toBeNull()

    const copy = claimed.body.data.pages.find((page: { photos: unknown[] }) => page.photos.length).photos[0]

    expect(copy.id).not.toBe(photoId)
    expect(claimed.body.data.coverPhotoId).toBe(copy.id)

    const clientBooks = await api('get', '/books', undefined, 'client')
    const photographerBooks = await api('get', '/books', undefined, 'photographer')
    const original = await api('get', `/photos/${photoId}`, undefined, 'photographer')

    expect(clientBooks.body.data.map((book: { id: string }) => book.id)).toContain(bookId)
    expect(photographerBooks.body.data.map((book: { id: string }) => book.id)).not.toContain(bookId)
    expect(original.status).toBe(200)
    expect((await api('get', `/books/${bookId}`, undefined, undefined, view)).status).toBe(404)
  })
})
