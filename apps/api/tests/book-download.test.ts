import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { unzipSync } from 'fflate'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const tokens = { photographer: '', client: '' }

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as?: keyof typeof tokens, code?: string) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as) call.set('Authorization', `Bearer ${tokens[as]}`)
  if (code) call.set('X-Access-Code', code)

  return body ? call.send(body) : call
}

const upload = async (name: string, license: string) => {
  const form = new FormData()

  form.append('photo', new Blob([pixel], { type: 'image/png' }), name)
  form.append('license', license)

  return (await request(app).post('/api/photos').set({ Accept: 'application/json', Authorization: `Bearer ${tokens.photographer}` }).send(form)).body.data.id as string
}

const files = async (bookId: string, as?: keyof typeof tokens, code?: string) => {
  const res = await api('get', `/books/${bookId}/download`, undefined, as, code)

  return { status: res.status, names: res.status === 200 ? Object.keys(unzipSync(new Uint8Array(res.body as Buffer))) : [], res }
}

describe('Book downloads', () => {
  let bookId = ''
  let closedBookId = ''
  const codes = { view: '', transfer: '' }

  beforeAll(async () => {
    for (const who of ['photographer', 'client'] as const) {
      const register = await api('post', '/auth/register', { name: `Zip ${who}`, email: `zip-${who}-${Date.now()}@toneflix.test`, password: 'password123' })

      tokens[who] = register.body.data.token
    }

    const kept = await upload('Kept Rights.png', 'all-rights-reserved')
    const open = await upload('Open Sky.png', 'cc0')

    bookId = (await api('post', '/books', { title: 'Wedding Day', visibility: 'private' }, 'photographer')).body.data.id
    closedBookId = (await api('post', '/books', { title: 'Closed', visibility: 'public' }, 'photographer')).body.data.id

    await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'single', photoIds: [kept] }, { layout: 'single', photoIds: [open] }] }, 'photographer')
    await api('put', `/books/${closedBookId}/pages`, { pages: [{ layout: 'single', photoIds: [kept] }] }, 'photographer')

    codes.view = (await api('post', `/books/${bookId}/access-codes`, { label: 'Guests' }, 'photographer')).body.data.code
    codes.transfer = (await api('post', `/books/${bookId}/access-codes`, { label: 'Couple', permissions: ['transfer'] }, 'photographer')).body.data.code
  })

  it('gives the owner every original in reading order', async () => {
    const { status, names, res } = await files(bookId, 'photographer')

    expect(status).toBe(200)
    expect(res.headers.get('content-disposition')).toContain('wedding-day-toneflix-photos.zip')
    expect(names).toEqual(['1-kept-rights.png', '2-open-sky.png'])
  })

  it('gives transfer code holders every original', async () => {
    expect((await files(bookId, undefined, codes.transfer)).names).toEqual(['1-kept-rights.png', '2-open-sky.png'])
  })

  it('gives everyone else only openly licensed photos', async () => {
    expect((await files(bookId, 'client', codes.view)).names).toEqual(['1-open-sky.png'])
    expect((await files(closedBookId)).status).toBe(403)
  })

  it('keeps private books hidden without a code', async () => {
    expect((await files(bookId, 'client')).status).toBe(404)
  })
})
