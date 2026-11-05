import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

let token = ''

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${token}` })

  return body ? call.send(body) : call
}

describe('Photo frames', () => {
  let photoId = ''
  let bookId = ''

  beforeAll(async () => {
    const register = await api('post', '/auth/register', { name: 'Ada Framer', email: `frames-${Date.now()}@toneflix.test`, password: 'password123' })

    token = register.body.data.token

    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')

    const upload = await request(app)
      .post('/api/photos')
      .set({ Accept: 'application/json', Authorization: `Bearer ${token}` })
      .send(form)

    photoId = upload.body.data.id
  })

  it('gives new books plain frames unless one is chosen', async () => {
    const plain = await api('post', '/books', { title: 'Plain book' })
    const matted = await api('post', '/books', { title: 'Matted book', frame: 'mat' })

    bookId = plain.body.data.id

    expect(plain.body.data.frame).toBe('none')
    expect(matted.body.data.frame).toBe('mat')
  })

  it('changes the book frame and rejects unknown ones', async () => {
    const changed = await api('put', `/books/${bookId}`, { frame: 'deckle' })
    const unknown = await api('put', `/books/${bookId}`, { frame: 'gold-leaf' })

    expect(changed.body.data.frame).toBe('deckle')
    expect(unknown.status).toBe(422)
  })

  it('lets each page keep its own frame or use the book one', async () => {
    const saved = await api('put', `/books/${bookId}/pages`, {
      pages: [
        { layout: 'framed', frame: 'corners', photoIds: [photoId] },
        { layout: 'pair', photoIds: [photoId] },
      ],
    })

    expect(saved.status).toBe(200)
    expect(saved.body.data.pages.map((page: { frame: string | null }) => page.frame)).toEqual(['corners', null])

    const unknown = await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'framed', frame: 'neon', photoIds: [photoId] }] })

    expect(unknown.status).toBe(422)
  })
})
