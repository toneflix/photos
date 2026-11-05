import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const upload = async (spaceId?: string) => {
  const form = new FormData()

  form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')
  if (spaceId) form.append('spaceId', spaceId)

  const response = await request(app)
    .post('/api/photos')
    .set({ Accept: 'application/json', Authorization: `Bearer ${tokens.owner}` })
    .send(form)

  return response.body.data.id as string
}

const ids = (response: { body: { data: { id: string }[] } }) => response.body.data.map((item) => item.id)

describe('Spaces', () => {
  let spaceId = ''
  let slug = ''
  let inside = ''
  let outside = ''
  let bookId = ''

  beforeAll(async () => {
    for (const who of ['owner', 'other']) {
      const register = await api(
        'post',
        '/auth/register',
        { name: `Space ${who}`, email: `space-${who}-${Date.now()}@toneflix.test`, password: 'password123' },
        null,
      )

      tokens[who] = register.body.data.token
    }
  })

  it('creates private spaces with a web address made from the name', async () => {
    const response = await api('post', '/spaces', { name: 'Ada’s Weddings', description: 'Ceremonies and parties' })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ name: 'Ada’s Weddings', visibility: 'private', photoCount: 0, bookCount: 0 })
    expect(response.body.data.slug).toMatch(/^ada-s-weddings/)

    spaceId = response.body.data.id
    slug = response.body.data.slug

    const again = await api('post', '/spaces', { name: 'Ada’s Weddings' })

    expect(again.body.data.slug).not.toBe(slug)

    const taken = await api('post', '/spaces', { name: 'Copy', slug })

    expect(taken.status).toBe(422)

    const list = await api('get', '/spaces')

    expect(ids(list)).toEqual([spaceId, again.body.data.id])
  })

  it('puts photos and books in a space and filters the library by it', async () => {
    inside = await upload(spaceId)
    outside = await upload()

    const book = await api('post', '/books', { title: 'Wedding book', spaceId, visibility: 'public' })

    bookId = book.body.data.id

    expect(book.body.data.spaceId).toBe(spaceId)

    await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'single', photoIds: [inside] }] })

    const photos = await api('get', `/photos?space=${spaceId}`)
    const books = await api('get', `/books?space=${spaceId}`)

    expect(ids(photos)).toEqual([inside])
    expect(ids(books)).toEqual([bookId])
  })

  it("won't use someone else's space", async () => {
    const response = await api('put', `/photos/${outside}`, { spaceId }, 'other')
    const book = await api('post', '/books', { title: 'Sneaky', spaceId }, 'other')

    expect(response.status).toBe(404)
    expect(book.status).toBe(404)
  })

  it('keeps a private space and its contents off Explore, except for its owner', async () => {
    await api('put', `/photos/${inside}`, { visibility: 'public' })
    await api('put', `/photos/${outside}`, { visibility: 'public' })

    const photos = await api('get', '/explore/photos', undefined, null)
    const books = await api('get', '/explore/books', undefined, null)
    const spaces = await api('get', '/explore/spaces', undefined, null)

    expect(ids(photos)).toContain(outside)
    expect(ids(photos)).not.toContain(inside)
    expect(ids(books)).not.toContain(bookId)
    expect(ids(spaces)).not.toContain(spaceId)

    expect((await api('get', `/explore/spaces/${slug}`, undefined, null)).status).toBe(404)
    expect((await api('get', `/explore/photos?space=${slug}`, undefined, 'other')).status).toBe(404)
    expect((await api('get', `/explore/photos/${inside}`, undefined, null)).status).toBe(404)

    const preview = await api('get', `/explore/spaces/${slug}`)

    expect(preview.status).toBe(200)
    expect(preview.body.data.canEdit).toBe(true)
  })

  it('browses a public space with only its own public photos and books', async () => {
    const update = await api('put', `/spaces/${spaceId}`, { visibility: 'public' })

    expect(update.body.data.publishedAt).toBeTruthy()

    const space = await api('get', `/explore/spaces/${slug}`, undefined, null)

    expect(space.body.data).toMatchObject({ id: spaceId, photoCount: 1, bookCount: 1, canEdit: false, owner: { name: 'Space owner' } })
    expect(space.body.data.previews.map((photo: { id: string }) => photo.id)).toEqual([inside])

    const photos = await api('get', `/explore/photos?space=${slug}`, undefined, null)
    const books = await api('get', `/explore/books?space=${slug}`, undefined, null)

    expect(ids(photos)).toEqual([inside])
    expect(photos.body.data[0].space).toEqual({ id: spaceId, name: 'Ada’s Weddings', slug })
    expect(ids(books)).toEqual([bookId])
    expect(ids(await api('get', '/explore/spaces?q=weddings', undefined, null))).toContain(spaceId)
    expect(ids(await api('get', '/explore/photos', undefined, null))).toContain(inside)
  })

  it('changes the web address and moves photos out', async () => {
    const taken = await api('post', '/spaces', { name: 'Taken address' })
    const clash = await api('put', `/spaces/${spaceId}`, { slug: taken.body.data.slug })

    expect(clash.status).toBe(422)

    const same = await api('put', `/spaces/${spaceId}`, { slug, name: 'Weddings' })

    expect(same.status).toBe(200)

    const moved = await api('put', `/photos/${inside}`, { spaceId: null })

    expect(moved.body.data.spaceId).toBeNull()
    expect(ids(await api('get', `/explore/photos?space=${slug}`, undefined, null))).toEqual([])

    await api('put', `/photos/${inside}`, { spaceId })
  })

  it('deleting a space keeps its photos and books in the library', async () => {
    const response = await api('delete', `/spaces/${spaceId}`)

    expect(response.status).toBe(200)
    expect((await api('get', `/photos/${inside}`)).body.data.spaceId).toBeNull()
    expect((await api('get', `/books/${bookId}`)).body.data.spaceId).toBeNull()
    expect((await api('get', `/explore/spaces/${slug}`, undefined, null)).status).toBe(404)
  })
})
