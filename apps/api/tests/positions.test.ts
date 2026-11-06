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

const upload = async () => {
  const form = new FormData()

  form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')

  const response = await request(app)
    .post('/api/photos')
    .set({ Accept: 'application/json', Authorization: `Bearer ${token}` })
    .send(form)

  return response.body.data.id as string
}

describe('Photo positions', () => {
  let photoId = ''
  let otherId = ''
  let bookId = ''

  beforeAll(async () => {
    const register = await api('post', '/auth/register', { name: 'Ada Cropper', email: `positions-${Date.now()}@toneflix.test`, password: 'password123' })

    token = register.body.data.token
    photoId = await upload()
    otherId = await upload()
    bookId = (await api('post', '/books', { title: 'Cropped book' })).body.data.id
  })

  it('keeps each photo position on a page, centred photos as null', async () => {
    const saved = await api('put', `/books/${bookId}/pages`, {
      pages: [
        {
          layout: 'pair',
          photoIds: [photoId, otherId],
          photoPositions: [{ x: 20.04, y: 75, zoom: 1.5 }, { x: 50, y: 50, zoom: 1 }],
        },
      ],
    })

    expect(saved.status).toBe(200)
    expect(saved.body.data.pages[0].photos.map((photo: { position: unknown }) => photo.position)).toEqual([{ x: 20, y: 75, zoom: 1.5 }, null])

    const opened = await api('get', `/books/${bookId}`)

    expect(opened.body.data.pages[0].photos[0].position).toEqual({ x: 20, y: 75, zoom: 1.5 })
  })

  it('rejects positions off the photo or past the zoom limit', async () => {
    const off = await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'single', photoIds: [photoId], photoPositions: [{ x: 140 }] }] })
    const zoomed = await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'single', photoIds: [photoId], photoPositions: [{ zoom: 9 }] }] })

    expect(off.status).toBe(422)
    expect(zoomed.status).toBe(422)
  })

  it('positions the cover photo and centres it again when the photo changes', async () => {
    const positioned = await api('put', `/books/${bookId}`, { coverPhotoId: photoId, coverPosition: { x: 10, y: 30, zoom: 2 } })

    expect(positioned.body.data.coverPosition).toEqual({ x: 10, y: 30, zoom: 2 })

    const same = await api('put', `/books/${bookId}`, { coverPhotoId: photoId })

    expect(same.body.data.coverPosition).toEqual({ x: 10, y: 30, zoom: 2 })

    const changed = await api('put', `/books/${bookId}`, { coverPhotoId: otherId })

    expect(changed.body.data.coverPosition).toBeNull()
  })
})
