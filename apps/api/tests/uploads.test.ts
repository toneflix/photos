import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('Uploads', () => {
  let token = ''

  const send = (path: string, files: Array<[string, Blob, string]>) => {
    const form = new FormData()

    for (const [field, blob, name] of files) form.append(field, blob, name)

    return request(app).post(`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${token}` }).send(form)
  }

  beforeAll(async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .set({ Accept: 'application/json' })
      .send({ name: 'Upload Tester', email: `uploads-${Date.now()}@toneflix.test`, password: 'password123' })

    token = register.body.data.token
  })

  it('stores the type and size read from the file, not the label it came with', async () => {
    const res = await send('/photos', [['photo', new Blob([pixel], { type: 'image/jpeg' }), 'pixel.jpg']])

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ mimeType: 'image/png', width: 1, height: 1 })
  })

  it('shows a WebP copy of each photo', async () => {
    const res = await send('/photos', [['photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png']])
    const path = new URL(res.body.data.url, 'http://localhost').pathname
    const shown = await request(app).get(path)

    expect(path).toMatch(/\.display\.webp$/)
    expect(shown.headers.get('content-type')).toBe('image/webp')
  })

  it('compresses originals over the size cap before storing them', async () => {
    const noise = await sharp(randomBytes(1600 * 1600 * 3), { raw: { width: 1600, height: 1600, channels: 3 } })
      .png()
      .toBuffer()

    const res = await send('/photos', [['photo', new Blob([noise], { type: 'image/png' }), 'noise.png']])

    expect(noise.length).toBeGreaterThan(5 * 1024 * 1024)
    expect(res.status).toBe(201)
    expect(res.body.data.mimeType).toBe('image/png')
    expect(res.body.data.size).toBeLessThanOrEqual(5 * 1024 * 1024)
    expect(res.body.data.width).toBe(res.body.data.height)
  }, 60_000)

  it('refuses files that only claim to be photos', async () => {
    const page = new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/png' })

    const photo = await send('/photos', [['photo', page, 'page.png']])
    const avatar = await send('/account/avatar', [['avatar', page, 'page.png']])

    expect(photo.status).toBe(422)
    expect(photo.body.errors.photo[0]).toContain('must be a JPEG, PNG')
    expect(avatar.status).toBe(422)
  })

  it('refuses files over 25 MB before reading them in full', async () => {
    const res = await send('/photos', [['photo', new Blob([Buffer.alloc(26 * 1024 * 1024)], { type: 'image/png' }), 'big.png']])

    expect(res.status).toBe(413)
    expect(res.body.message).toBe('Files can be up to 25 MB.')
  })

  it('takes one file per request', async () => {
    const res = await send('/photos', [
      ['photo', new Blob([pixel], { type: 'image/png' }), 'one.png'],
      ['extra', new Blob([pixel], { type: 'image/png' }), 'two.png'],
    ])

    expect(res.status).toBe(413)
    expect(res.body.message).toBe('Send one file at a time.')
  })
})
