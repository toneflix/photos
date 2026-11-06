import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { execFileSync } from 'node:child_process'
import request from 'parasito'

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const tokens: Record<string, string> = {}
const accounts: Record<string, { id: string; email: string }> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const today = () => new Date().toISOString().slice(0, 10)

describe('Views and downloads', () => {
  let photoId = ''
  let bookId = ''
  let spaceSlug = ''
  let spaceId = ''

  beforeAll(async () => {
    for (const who of ['owner', 'visitor', 'admin']) {
      const email = `stats-${who}-${Date.now()}@toneflix.test`
      const register = await api('post', '/auth/register', { name: `Stats ${who}`, email, password: 'password123' }, null)

      tokens[who] = register.body.data.token
      accounts[who] = { id: register.body.data.user.id, email }
    }

    execFileSync('npx', ['ark', 'users:role', accounts.admin.email, 'admin'], { cwd: process.cwd() })

    const space = await api('post', '/spaces', { name: 'Stats space', visibility: 'public' })

    spaceId = space.body.data.id
    spaceSlug = space.body.data.slug

    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')
    form.append('license', 'cc-by')
    form.append('spaceId', spaceId)

    const upload = await request(app)
      .post('/api/photos')
      .set({ Accept: 'application/json', Authorization: `Bearer ${tokens.owner}` })
      .send(form)

    photoId = upload.body.data.id
    await api('put', `/photos/${photoId}`, { visibility: 'public' })

    bookId = (await api('post', '/books', { title: 'Stats book', visibility: 'public' })).body.data.id
    await api('put', `/books/${bookId}/pages`, { pages: [{ layout: 'single', photoIds: [photoId] }] })
  }, 60_000)

  it('counts each visitor once, never the owner and never a prefetch', async () => {
    await api('get', `/explore/photos/${photoId}`, undefined, 'visitor')
    await api('get', `/explore/photos/${photoId}`, undefined, 'visitor')
    await api('get', `/explore/photos/${photoId}`)
    await api('get', `/explore/photos/${photoId}`, undefined, 'admin').set('Purpose', 'prefetch')

    const own = await api('get', `/explore/photos/${photoId}`)

    expect(own.body.data.stats).toEqual({ views: 1, downloads: 0 })
  })

  it('shows counts to visitors only when the owner chooses to', async () => {
    expect((await api('get', `/explore/photos/${photoId}`, undefined, 'visitor')).body.data.stats).toBeNull()

    const saved = await api('put', '/account/privacy', { showCounts: true })

    expect(saved.body.data.showCounts).toBe(true)
    expect((await api('get', `/explore/photos/${photoId}`, undefined, 'visitor')).body.data.stats).toEqual({ views: 1, downloads: 0 })
  })

  it('counts downloads, book views and space views', async () => {
    const download = await api('get', `/explore/photos/${photoId}/download`, undefined, 'visitor')

    expect(download.status).toBe(200)
    expect((await api('get', `/explore/photos/${photoId}`, undefined, 'visitor')).body.data.stats).toEqual({ views: 1, downloads: 1 })

    await api('get', `/books/${bookId}`, undefined, 'visitor')

    expect((await api('get', `/books/${bookId}`, undefined, 'visitor')).body.data.stats).toEqual({ views: 1, downloads: 0 })

    await api('get', `/explore/spaces/${spaceSlug}`, undefined, 'visitor')

    expect((await api('get', `/explore/spaces/${spaceSlug}`, undefined, 'visitor')).body.data.stats).toEqual({ views: 1, downloads: null })
  })

  it('charts views and downloads per day for admins', async () => {
    const photo = await api('get', `/admin/moderation/photos/${photoId}?days=7`, undefined, 'admin')

    expect(photo.status).toBe(200)
    expect(photo.body.data).toMatchObject({ viewCount: 1, downloadCount: 1 })
    expect(photo.body.data.daily).toHaveLength(7)
    expect(photo.body.data.daily.at(-1)).toEqual({ date: today(), views: 1, downloads: 1 })

    const owner = await api('get', `/admin/users/${accounts.owner.id}`, undefined, 'admin')

    expect(owner.body.data.totals).toEqual({ views: 3, downloads: 1 })
    expect(owner.body.data.topPhotos[0]).toMatchObject({ id: photoId, viewCount: 1 })
    expect(owner.body.data.publicBookCount).toBe(1)

    const overview = await api('get', '/admin/overview', undefined, 'admin')

    expect(overview.body.data.engagement.views).toBeGreaterThanOrEqual(3)
    expect(overview.body.data.daily).toHaveLength(30)

    const sorted = await api('get', '/admin/moderation/photos?sort=views', undefined, 'admin')

    expect(sorted.status).toBe(200)
    expect((await api('get', `/admin/moderation/spaces/${spaceId}`, undefined, 'admin')).body.data.viewCount).toBe(1)
  })
})
