import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

let token = ''

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, signedIn = true) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (signedIn && token) call.set('Authorization', `Bearer ${token}`)

  return body ? call.send(body) : call
}

describe('Explore', () => {
  let photoId = ''
  let bookId = ''

  beforeAll(async () => {
    const email = `explore-${Date.now()}@toneflix.test`
    const register = await api('post', '/auth/register', { name: 'Ada Explorer', email, password: 'password123' })

    token = register.body.data.token

    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')

    const upload = await request(app)
      .post('/api/photos')
      .set({ Accept: 'application/json', Authorization: `Bearer ${token}` })
      .send(form)

    photoId = upload.body.data.id

    const book = await api('post', '/books', { title: 'Open book', visibility: 'private' })

    bookId = book.body.data.id

    await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'text', caption: 'Hello' }, { layout: 'single', photoIds: [photoId] }] })
  })

  it('keeps private photos and books off the timeline', async () => {
    const photos = await api('get', '/explore/photos', undefined, false)
    const books = await api('get', '/explore/books', undefined, false)
    const photo = await api('get', `/explore/photos/${photoId}`, undefined, false)

    expect(photos.status).toBe(200)
    expect(photos.body.data.map((item: { id: string }) => item.id)).not.toContain(photoId)
    expect(books.body.data.map((item: { id: string }) => item.id)).not.toContain(bookId)
    expect(photo.status).toBe(404)
  })

  it('shows a photo once its owner makes it public, with the owner and its public books', async () => {
    const update = await api('put', `/photos/${photoId}`, { visibility: 'public' })

    expect(update.body.data.visibility).toBe('public')
    expect(update.body.data.publishedAt).toBeTruthy()

    await api('put', `/books/${bookId}`, { visibility: 'public' })

    const photos = await api('get', '/explore/photos', undefined, false)
    const listed = photos.body.data.find((item: { id: string }) => item.id === photoId)

    expect(photos.body.data[0].id).toBe(photoId)
    expect(listed.owner.name).toBe('Ada Explorer')
    expect(listed.owner).not.toHaveProperty('email')

    const photo = await api('get', `/explore/photos/${photoId}`, undefined, false)

    expect(photo.status).toBe(200)
    expect(photo.body.data.books).toEqual([{ id: bookId, title: 'Open book', theme: 'classic', page: 2 }])
  })

  it('lists public books that have pages, newest first', async () => {
    const books = await api('get', '/explore/books', undefined, false)

    expect(books.body.data[0].id).toBe(bookId)
    expect(books.body.data[0].owner.name).toBe('Ada Explorer')
    expect(books.body.data[0].pageCount).toBe(2)
  })

  it('hides the owner when they keep their name off shared work', async () => {
    await api('put', '/account/privacy', { showOwnerName: false })

    const photo = await api('get', `/explore/photos/${photoId}`, undefined, false)

    expect(photo.body.data.owner).toEqual({ id: null, name: null, avatarUrl: null })
  })

  it('takes a photo off the timeline when it goes private again', async () => {
    await api('put', `/photos/${photoId}`, { visibility: 'private' })

    const photo = await api('get', `/explore/photos/${photoId}`, undefined, false)

    expect(photo.status).toBe(404)
  })
})
