import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import sharp from 'sharp'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('Licensing', () => {
  let token = ''
  let photoId = ''

  const api = (method: 'get' | 'put', path: string, body?: Record<string, unknown>, signedIn = true) => {
    const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

    if (signedIn) call.set('Authorization', `Bearer ${token}`)

    return body ? call.send(body) : call
  }

  const upload = async (fields: Record<string, string> = {}) => {
    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')
    form.append('caption', 'Harbour at dawn')

    for (const [key, value] of Object.entries(fields)) form.append(key, value)

    return (await request(app).post('/api/photos').set({ Accept: 'application/json', Authorization: `Bearer ${token}` }).send(form)).body.data
  }

  beforeAll(async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .set({ Accept: 'application/json' })
      .send({ name: 'Lens Owner', email: `license-${Date.now()}@toneflix.test`, password: 'password123' })

    token = register.body.data.token

    const photo = await upload()

    photoId = photo.id

    await api('put', `/photos/${photoId}`, { visibility: 'public' })
  })

  it('keeps all rights by default and blocks downloads', async () => {
    const photo = await api('get', `/explore/photos/${photoId}`, undefined, false)
    const download = await api('get', `/explore/photos/${photoId}/download`, undefined, false)

    expect(photo.body.data.license).toBe('all-rights-reserved')
    expect(download.status).toBe(403)
  })

  it('allows downloads once the owner picks an open licence', async () => {
    const update = await api('put', `/photos/${photoId}`, { license: 'cc-by' })

    expect(update.body.data.license).toBe('cc-by')

    const download = await api('get', `/explore/photos/${photoId}/download`, undefined, false)

    expect(download.status).toBe(200)
    expect(download.headers.get('content-type')).toContain('image/png')
    expect(download.headers.get('content-disposition')).toContain('attachment; filename="harbour-at-dawn-toneflix-photos.png"')
  })

  it('downloads open photos at preset and custom sizes made from the original', async () => {
    const form = new FormData()
    const image = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#0af' } })
      .jpeg()
      .toBuffer()

    form.append('photo', new Blob([image], { type: 'image/jpeg' }), 'wide.jpg')
    form.append('caption', 'Wide sky')
    form.append('license', 'cc0')

    const { id, downloads } = (await request(app).post('/api/photos').set({ Accept: 'application/json', Authorization: `Bearer ${token}` }).send(form)).body.data

    await api('put', `/photos/${id}`, { visibility: 'public' })

    const sized = async (query: string) => {
      const res = await api('get', `/explore/photos/${id}/download?${query}`, undefined, false)

      return { res, meta: res.status === 200 ? await sharp(Buffer.from(res.body as Buffer)).metadata() : null }
    }

    const large = await sized('size=large')
    const custom = await sized('width=800&height=800')
    const wide = await sized('width=600')
    const huge = await sized('width=6000&height=3000')
    const original = await sized('size=original')

    expect(downloads).toEqual([
      { size: 'original', width: 3000, height: 2000 },
      { size: 'large', width: 1920, height: 1280 },
      { size: 'medium', width: 1280, height: 853 },
      { size: 'small', width: 640, height: 427 },
    ])
    expect(large.meta).toMatchObject({ format: 'jpeg', width: 1920, height: 1280 })
    expect(large.res.headers.get('content-disposition')).toContain('wide-sky-toneflix-photos-1920x1280.jpg')
    expect(custom.meta).toMatchObject({ width: 800, height: 800 })
    expect(wide.meta).toMatchObject({ width: 600, height: 400 })
    expect(huge.meta).toMatchObject({ width: 3000, height: 1500 })
    expect(original.meta).toMatchObject({ width: 3000, height: 2000 })
    expect((await sized('width=0')).res.status).toBe(422)
  }, 30_000)

  it('lets owners download their own photos whatever the licence', async () => {
    const res = await api('get', `/photos/${photoId}/download?size=original`)
    const pixelAgain = Buffer.from(res.body as Buffer)

    expect(res.status).toBe(200)
    expect(pixelAgain.equals(pixel)).toBe(true)
  })

  it('never downloads a private photo, whatever its licence', async () => {
    await api('put', `/photos/${photoId}`, { visibility: 'private' })

    expect((await api('get', `/explore/photos/${photoId}/download`, undefined, false)).status).toBe(404)

    await api('put', `/photos/${photoId}`, { visibility: 'public' })
  })

  it('gives new uploads the account default licence, unless one is picked', async () => {
    const settings = await api('put', '/account/privacy', { defaultLicense: 'cc0' })

    expect(settings.body.data.defaultLicense).toBe('cc0')
    expect((await upload()).license).toBe('cc0')
    expect((await upload({ license: 'cc-by-nc' })).license).toBe('cc-by-nc')
  })

  it('rejects unknown licences', async () => {
    expect((await api('put', `/photos/${photoId}`, { license: 'mine-forever' })).status).toBe(422)
  })
})
