import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import request from 'parasito'
import sharp from 'sharp'

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const tokens: Record<string, string> = {}
const accounts: Record<string, { id: string; email: string }> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'admin') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const assignRole = (email: string, role: string) => execFileSync('npx', ['ark', 'users:role', email, role], { cwd: process.cwd(), encoding: 'utf8' })

const signIn = (who: string) => api('post', '/auth/login', { email: accounts[who].email, password: 'password123' }, null)

describe('Admin dashboard', () => {
  beforeAll(async () => {
    for (const who of ['admin', 'moderator', 'member']) {
      const email = `admin-${who}-${Date.now()}@toneflix.test`
      const register = await api('post', '/auth/register', { name: `Admin test ${who}`, email, password: 'password123' }, null)

      tokens[who] = register.body.data.token
      accounts[who] = { id: register.body.data.user.id, email }
    }

    assignRole(accounts.admin.email, 'admin')
    assignRole(accounts.moderator.email, 'moderator')
  }, 60_000)

  afterAll(async () => {
    await api('put', '/admin/settings/uploads', { max_avatar_mb: null })
    await api('put', '/admin/settings/display', { display_quality: null })
  })

  it('gives each role its admin areas', async () => {
    const admin = await api('get', '/auth/me')
    const moderator = await api('get', '/auth/me', undefined, 'moderator')
    const member = await api('get', '/auth/me', undefined, 'member')

    expect(admin.body.data).toMatchObject({
      role: 'admin',
      permissions: ['dashboard.view', 'users.view', 'users.manage', 'content.moderate', 'settings.manage', 'roles.manage'],
    })
    expect(moderator.body.data).toMatchObject({ role: 'moderator', permissions: ['dashboard.view', 'content.moderate'] })
    expect(member.body.data).toMatchObject({ role: 'user', permissions: [] })
  })

  it('keeps members and signed-out visitors out', async () => {
    expect((await api('get', '/admin/overview', undefined, null)).status).toBe(401)
    expect((await api('get', '/admin/overview', undefined, 'member')).status).toBe(403)
    expect((await api('get', '/admin/settings', undefined, 'member')).status).toBe(403)
  })

  it('lets moderators see the overview and moderation, but not users or settings', async () => {
    expect((await api('get', '/admin/overview', undefined, 'moderator')).status).toBe(200)
    expect((await api('get', '/admin/moderation/photos', undefined, 'moderator')).status).toBe(200)
    expect((await api('get', '/admin/users', undefined, 'moderator')).status).toBe(403)
    expect((await api('get', '/admin/settings', undefined, 'moderator')).status).toBe(403)
  })

  it('counts accounts and content on the overview', async () => {
    const response = await api('get', '/admin/overview')

    expect(response.status).toBe(200)
    expect(response.body.data.users.total).toBeGreaterThanOrEqual(3)
    expect(response.body.data.users.staff).toBeGreaterThanOrEqual(2)
    expect(response.body.data.recentUsers.length).toBeGreaterThan(0)
    expect(response.body.data.photos).toHaveProperty('storageBytes')
  })

  it('finds accounts and changes their role, but not your own', async () => {
    const found = await api('get', `/admin/users?q=${encodeURIComponent(accounts.member.email)}`)

    expect(found.body.data.map((user: { id: string }) => user.id)).toEqual([accounts.member.id])
    expect(found.body.data[0]).toMatchObject({ role: 'user', suspended: false })

    const promoted = await api('put', `/admin/users/${accounts.member.id}`, { role: 'moderator' })

    expect(promoted.body.data.role).toBe('moderator')
    expect((await api('put', `/admin/users/${accounts.member.id}`, { role: 'user' })).body.data.role).toBe('user')
    expect((await api('put', `/admin/users/${accounts.admin.id}`, { role: 'user' })).status).toBe(422)
    expect((await api('put', `/admin/users/${accounts.member.id}`, { role: 'owner' })).status).toBe(422)
  })

  it('suspends an account, signing it out everywhere, and lets it back in', async () => {
    const suspended = await api('put', `/admin/users/${accounts.member.id}`, { suspended: true })

    expect(suspended.body.data.suspended).toBe(true)
    expect((await api('get', '/auth/me', undefined, 'member')).status).toBe(401)
    expect((await signIn('member')).status).toBe(403)

    await api('put', `/admin/users/${accounts.member.id}`, { suspended: false })

    const back = await signIn('member')

    expect(back.status).toBe(200)

    tokens.member = back.body.data.token
  })

  it('takes public photos off Explore', async () => {
    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')
    form.append('caption', `Moderate me ${Date.now()}`)

    const upload = await request(app)
      .post('/api/photos')
      .set({ Accept: 'application/json', Authorization: `Bearer ${tokens.member}` })
      .send(form)
    const photoId = upload.body.data.id

    await api('put', `/photos/${photoId}`, { visibility: 'public' }, 'member')

    const listed = await api('get', `/admin/moderation/photos?q=${encodeURIComponent(accounts.member.email)}`, undefined, 'moderator')

    expect(listed.body.data[0]).toMatchObject({ id: photoId, kind: 'photo', owner: { id: accounts.member.id } })

    const unpublished = await api('post', `/admin/moderation/photos/${photoId}/unpublish`, undefined, 'moderator')

    expect(unpublished.body.data.visibility).toBe('private')
    expect((await api('get', `/explore/photos/${photoId}`, undefined, null)).status).toBe(404)
    expect((await api('get', '/admin/moderation/videos', undefined, 'moderator')).status).toBe(404)
  })

  it('builds new roles from permissions and gives them to accounts', async () => {
    const list = await api('get', '/admin/roles')

    expect(list.body.data.map((role: { slug: string }) => role.slug)).toEqual(expect.arrayContaining(['user', 'admin', 'moderator']))
    expect(list.body.permissions.map((permission: { name: string }) => permission.name)).toContain('roles.manage')

    const created = await api('post', '/admin/roles', { name: `Support ${Date.now()}`, permissions: ['dashboard.view', 'users.view', 'made.up'] })

    expect(created.status).toBe(422)

    const support = await api('post', '/admin/roles', { name: 'Support desk', description: 'Answers account questions', permissions: ['dashboard.view', 'users.view'] })
    const role = support.body.data

    expect(support.status).toBe(201)
    expect(role).toMatchObject({ name: 'Support desk', permissions: ['dashboard.view', 'users.view'], system: false, userCount: 0 })
    expect(role.slug).toMatch(/^support-desk/)

    await api('put', `/admin/users/${accounts.member.id}`, { role: role.slug })

    expect((await api('get', '/auth/me', undefined, 'member')).body.data.permissions).toEqual(['dashboard.view', 'users.view'])
    expect((await api('get', '/admin/users', undefined, 'member')).status).toBe(200)
    expect((await api('put', `/admin/users/${accounts.moderator.id}`, { role: 'user' }, 'member')).status).toBe(403)

    await api('put', `/admin/roles/${role.id}`, { permissions: ['dashboard.view'] })

    expect((await api('get', '/admin/users', undefined, 'member')).status).toBe(403)
    expect((await api('delete', `/admin/roles/${role.id}`)).status).toBe(422)

    await api('put', `/admin/users/${accounts.member.id}`, { role: 'user' })

    expect((await api('delete', `/admin/roles/${role.id}`)).status).toBe(200)
    expect((await api('put', `/admin/users/${accounts.member.id}`, { role: role.slug })).status).toBe(422)
  })

  it('keeps the built-in roles as they are', async () => {
    const roles = (await api('get', '/admin/roles')).body.data
    const admin = roles.find((role: { slug: string }) => role.slug === 'admin')

    expect(admin.system).toBe(true)
    expect((await api('put', `/admin/roles/${admin.id}`, { permissions: [] })).status).toBe(422)
    expect((await api('delete', `/admin/roles/${admin.id}`)).status).toBe(422)
    expect((await api('get', '/admin/roles', undefined, 'moderator')).status).toBe(403)
  })

  it('lists settings groups with their .env defaults', async () => {
    const response = await api('get', '/admin/settings')
    const uploads = response.body.data.find((group: { id: string }) => group.id === 'uploads')

    expect(uploads.fields.find((field: { name: string }) => field.name === 'max_original_mb')).toMatchObject({
      env: 'PHOTOS_MAX_ORIGINAL_MB',
      type: 'number',
      default: 5,
      saved: false,
    })
  })

  it('saves settings that override .env until they match it again', async () => {
    const saved = await api('put', '/admin/settings/display', { display_quality: 70 })
    const quality = () => saved.body.data.fields.find((field: { name: string }) => field.name === 'display_quality')

    expect(quality()).toMatchObject({ value: 70, default: 80, saved: true })

    const reset = await api('put', '/admin/settings/display', { display_quality: 80 })

    expect(reset.body.data.fields.find((field: { name: string }) => field.name === 'display_quality')).toMatchObject({ value: 80, saved: false })
    expect((await api('put', '/admin/settings/display', { display_quality: 101 })).status).toBe(422)
    expect((await api('put', '/admin/settings/nothing', {})).status).toBe(404)
  })

  it('applies upload limits as soon as they are saved', async () => {
    await api('put', '/admin/settings/uploads', { max_avatar_mb: 1 })

    expect((await api('get', '/limits', undefined, null)).body.data.maxAvatarMb).toBe(1)

    const noise = await sharp(randomBytes(800 * 800 * 3), { raw: { width: 800, height: 800, channels: 3 } })
      .png()
      .toBuffer()
    const form = new FormData()

    form.append('avatar', new Blob([noise], { type: 'image/png' }), 'noise.png')

    const response = await request(app)
      .post('/api/account/avatar')
      .set({ Accept: 'application/json', Authorization: `Bearer ${tokens.member}` })
      .send(form)

    expect(noise.length).toBeGreaterThan(1024 * 1024)
    expect(response.status).toBe(422)
  })
})
