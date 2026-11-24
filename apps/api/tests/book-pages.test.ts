import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import sharp from 'sharp'
import { putOnPlan } from './support/plans'

const tokens = { premium: '', free: '', guest: '' }

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as?: keyof typeof tokens, code?: string) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as) call.set('Authorization', `Bearer ${tokens[as]}`)
  if (code) call.set('X-Access-Code', code)

  return body ? call.send(body) : call
}

const upload = async (as: keyof typeof tokens) => {
  const photo = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#6a8caf' } }).jpeg().toBuffer()
  const form = new FormData()

  form.append('photo', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'Lake.jpg')

  return (await request(app).post('/api/photos').set({ Accept: 'application/json', Authorization: `Bearer ${tokens[as]}` }).send(form)).body.data.id as string
}

const book = async (as: keyof typeof tokens, title: string) => {
  const photoId = await upload(as)
  const id = (await api('post', '/books', { title, visibility: 'public' }, as)).body.data.id as string

  await api('put', `/books/${id}/pages`, { pages: [{ layout: 'single', photoIds: [photoId], caption: 'First light' }, { layout: 'text', caption: 'The end' }] }, as)

  return id
}

describe('Book pages to print', () => {
  const books = { premium: '', free: '' }

  beforeAll(async () => {
    for (const who of ['premium', 'free', 'guest'] as const) {
      const email = `print-${who}-${Date.now()}@toneflix.test`

      tokens[who] = (await api('post', '/auth/register', { name: `Print ${who}`, email, password: 'password123' })).body.data.token
      if (who === 'premium') putOnPlan(email)
    }

    books.premium = await book('premium', 'Lake Days')
    books.free = await book('free', 'Free Book')
  })

  it('gives a Premium owner every page as one PDF', async () => {
    const res = await api('get', `/books/${books.premium}/pages/download`, undefined, 'premium')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('lake-days-pages-toneflix-photos.pdf')
  }, 60_000)

  it('keeps page downloads to Premium', async () => {
    expect((await api('get', `/books/${books.free}/pages/download`, undefined, 'free')).status).toBe(403)
  })

  it('keeps page downloads to the owner', async () => {
    expect((await api('get', `/books/${books.premium}/pages/download`, undefined, 'guest')).status).toBe(403)
    expect((await api('get', `/books/${books.premium}/pages/download`)).status).toBe(401)
  })

  it('tells each visitor whether they can download pages', async () => {
    const canDownloadPages = async (id: string, as: keyof typeof tokens) => (await api('get', `/books/${id}`, undefined, as)).body.data.canDownloadPages

    expect(await canDownloadPages(books.premium, 'premium')).toBe(true)
    expect(await canDownloadPages(books.premium, 'guest')).toBe(false)
    expect(await canDownloadPages(books.free, 'free')).toBe(false)
  })
})
