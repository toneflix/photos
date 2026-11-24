import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import request from 'parasito'
import sharp from 'sharp'
import { unzipSync } from 'fflate'
import { putOnPlan } from './support/plans'
import { startPrintBrowser } from './support/print-browser'

// The print settings are read when the app boots, so the stand-in browser starts first.
const browser = await startPrintBrowser()
const { app } = await import('../src/core/bootstrap')

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

  afterAll(() => browser.close())

  it('gives a Premium owner every page as one PDF', async () => {
    const res = await api('get', `/books/${books.premium}/pages/download`, undefined, 'premium')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('lake-days-pages-toneflix-photos.pdf')
  }, 60_000)

  it('gives a Premium owner every page as an image in a zip', async () => {
    const res = await api('get', `/books/${books.premium}/pages/download?format=images`, undefined, 'premium')
    const names = Object.keys(unzipSync(new Uint8Array(res.body as Buffer)))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toContain('lake-days-pages-toneflix-photos.zip')
    expect(names).toEqual(['1-cover.png', '2-title.png', '3-page-1.png', '4-page-2.png', '5-colophon.png', '6-back.png'])
  }, 60_000)

  it('keeps page downloads to Premium', async () => {
    expect((await api('get', `/books/${books.free}/pages/download`, undefined, 'free')).status).toBe(403)
    expect((await api('get', `/books/${books.free}/pages/download?format=images`, undefined, 'free')).status).toBe(403)
  })

  it('keeps page downloads to the owner', async () => {
    expect((await api('get', `/books/${books.premium}/pages/download`, undefined, 'guest')).status).toBe(403)
    expect((await api('get', `/books/${books.premium}/pages/download`)).status).toBe(401)
  })

  it('tells each visitor which page downloads they have', async () => {
    const pageDownloads = async (id: string, as: keyof typeof tokens) => (await api('get', `/books/${id}`, undefined, as)).body.data.pageDownloads

    expect(await pageDownloads(books.premium, 'premium')).toEqual({ pdf: true, images: true })
    expect(await pageDownloads(books.premium, 'guest')).toEqual({ pdf: false, images: false })
    expect(await pageDownloads(books.free, 'free')).toEqual({ pdf: false, images: false })
  })
})
