import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('Removing photos', () => {
  let token = ''

  const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>) => {
    const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${token}` })

    return body ? call.send(body) : call
  }

  const upload = async (): Promise<string> => {
    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')

    const res = await request(app).post('/api/photos').set({ Accept: 'application/json', Authorization: `Bearer ${token}` }).send(form)

    return res.body.data.id
  }

  beforeAll(async () => {
    const register = await api('post', '/auth/register', { name: 'Removal Tester', email: `removal-${Date.now()}@toneflix.test`, password: 'password123' })

    token = register.body.data.token
  })

  it('deletes a photo that no book uses as its cover', async () => {
    const photoId = await upload()

    const removed = await api('delete', `/photos/${photoId}`)
    const gone = await api('get', `/photos/${photoId}`)

    expect(removed.status).toBe(200)
    expect(gone.status).toBe(404)
  })

  it('clears the photo from every book that shows it', async () => {
    const photoId = await upload()
    const bookIds: string[] = []

    for (const title of ['First', 'Second']) {
      const book = await api('post', '/books', { title })

      await api('put', `/books/${book.body.data.id}/pages`, { pages: [{ layout: 'single', photoIds: [photoId] }] })
      await api('put', `/books/${book.body.data.id}`, { coverPhotoId: photoId })

      bookIds.push(book.body.data.id)
    }

    const removed = await api('delete', `/photos/${photoId}`)
    const books = await Promise.all(bookIds.map((id) => api('get', `/books/${id}`)))

    expect(removed.status).toBe(200)

    for (const book of books) {
      expect(book.body.data.coverPhotoId).toBeNull()
      expect(book.body.data.pages.flatMap((page: { photos: unknown[] }) => page.photos)).toEqual([])
    }
  })
})
