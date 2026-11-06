import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { putOnPlan } from './support/plans'
import { DB } from '@arkstack/database'

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const people = ['owner', 'viewer', 'maker', 'stranger', 'extra'] as const

type Person = (typeof people)[number]

const tokens: Partial<Record<Person, string>> = {}
const emails: Partial<Record<Person, string>> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: Person | null = 'owner') => {
  const call = request(app)
    [method](`/api${path}`)
    .set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const upload = async (as: Person, spaceId?: string) => {
  const form = new FormData()

  form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')
  if (spaceId) form.append('spaceId', spaceId)

  return request(app)
    .post('/api/photos')
    .set({ Accept: 'application/json', Authorization: `Bearer ${tokens[as]}` })
    .send(form)
}

const ids = (response: { body: { data: { id: string }[] } }) => response.body.data.map((item) => item.id)

const verify = (who: Person) => DB.raw('update users set email_verified_at = now() where email = ?', [emails[who]])

describe('Space members', () => {
  let spaceId = ''
  let slug = ''
  let photoId = ''
  let bookId = ''
  let makerPhotoId = ''
  const members: Partial<Record<Person, string>> = {}

  beforeAll(async () => {
    for (const who of people) {
      emails[who] = `space-${who}-${Date.now()}@toneflix.test`

      const register = await api('post', '/auth/register', { name: `Member ${who}`, email: emails[who], password: 'password123' }, null)

      tokens[who] = register.body.data.token
    }

    putOnPlan(emails.owner!, 'free')

    const space = await api('post', '/spaces', { name: 'Family album' })

    spaceId = space.body.data.id
    slug = space.body.data.slug

    photoId = (await upload('owner', spaceId)).body.data.id

    await api('put', `/photos/${photoId}`, { visibility: 'public' })

    bookId = (await api('post', '/books', { title: 'Our summer', spaceId })).body.data.id
  })

  it('invites people by email with the permissions the owner picks', async () => {
    const viewer = await api('post', `/spaces/${spaceId}/members`, { email: emails.viewer!.toUpperCase() })
    const maker = await api('post', `/spaces/${spaceId}/members`, { email: emails.maker, permissions: ['create', 'edit'] })

    expect(viewer.status).toBe(201)
    expect(viewer.body.data).toMatchObject({ email: emails.viewer, permissions: ['view'], status: 'invited' })
    expect(maker.body.data.permissions).toEqual(['view', 'create', 'edit'])

    members.viewer = viewer.body.data.id
    members.maker = maker.body.data.id

    expect((await api('post', `/spaces/${spaceId}/members`, { email: emails.viewer })).status).toBe(422)
    expect((await api('post', `/spaces/${spaceId}/members`, { email: emails.owner })).status).toBe(422)
    expect((await api('post', `/spaces/${spaceId}/members`, { email: emails.extra }, 'stranger')).status).toBe(404)
  })

  it('shows invites to the invited address and joins once the email is confirmed', async () => {
    const invites = await api('get', '/account/space-invites', undefined, 'viewer')

    expect(ids(invites)).toEqual([members.viewer])
    expect(invites.body.data[0]).toMatchObject({ permissions: ['view'], space: { name: 'Family album', slug }, invitedBy: { name: 'Member owner' } })
    expect((await api('get', '/account/space-invites', undefined, 'stranger')).body.data).toEqual([])

    expect((await api('post', `/account/space-invites/${members.viewer}/accept`, undefined, 'viewer')).status).toBe(403)
    expect((await api('post', `/account/space-invites/${members.viewer}/accept`, undefined, 'stranger')).status).toBe(404)

    await verify('viewer')
    await verify('maker')

    const joined = await api('post', `/account/space-invites/${members.viewer}/accept`, undefined, 'viewer')

    expect(joined.status).toBe(200)
    expect(joined.body.data).toMatchObject({ id: spaceId, permissions: ['view'], canEdit: false })

    await api('post', `/account/space-invites/${members.maker}/accept`, undefined, 'maker')

    expect((await api('get', '/account/space-invites', undefined, 'viewer')).body.data).toEqual([])
    expect(ids(await api('get', '/account/shared-spaces', undefined, 'maker'))).toEqual([spaceId])
  })

  it('opens a private space for members only', async () => {
    const page = await api('get', `/explore/spaces/${slug}`, undefined, 'viewer')

    expect(page.status).toBe(200)
    expect(page.body.data).toMatchObject({ photoCount: 1, permissions: ['view'] })
    expect(ids(await api('get', `/explore/photos?space=${slug}`, undefined, 'viewer'))).toEqual([photoId])
    expect((await api('get', `/explore/photos/${photoId}`, undefined, 'viewer')).status).toBe(200)

    expect((await api('get', `/explore/spaces/${slug}`, undefined, 'stranger')).status).toBe(404)
    expect((await api('get', `/explore/photos/${photoId}`, undefined, 'stranger')).status).toBe(404)
  })

  it('lets members with create add their own work, and keeps others out', async () => {
    const denied = await upload('viewer', spaceId)

    expect(denied.status).toBe(403)

    const added = await upload('maker', spaceId)

    expect(added.status).toBe(201)

    makerPhotoId = added.body.data.id

    await api('put', `/photos/${makerPhotoId}`, { visibility: 'public' }, 'maker')

    const book = await api('post', '/books', { title: 'Maker book', spaceId }, 'maker')

    expect(book.status).toBe(201)
    expect(ids(await api('get', `/explore/photos?space=${slug}`, undefined, 'viewer')).sort()).toEqual([photoId, makerPhotoId].sort())

    const space = await api('get', '/spaces')

    expect(space.body.data[0]).toMatchObject({ id: spaceId, photoCount: 2 })
  })

  it('lets members with edit change the books in the space', async () => {
    const pages = { pages: [{ layout: 'single', photoIds: [photoId] }] }

    expect((await api('put', `/books/${bookId}/pages`, pages, 'viewer')).status).toBe(404)

    const saved = await api('put', `/books/${bookId}/pages`, pages, 'maker')

    expect(saved.status).toBe(200)
    expect(saved.body.data.permissions).toEqual(['view', 'add', 'edit'])
    expect((await api('put', `/books/${bookId}`, { visibility: 'public' }, 'maker')).status).toBe(403)
  })

  it('leaves managing members to the owner and the managers they pick', async () => {
    expect((await api('get', `/spaces/${spaceId}/members`, undefined, 'viewer')).status).toBe(403)

    const list = await api('get', `/spaces/${spaceId}/members`)

    expect(list.body.data.map((member: { email: string; status: string }) => [member.email, member.status])).toEqual(
      expect.arrayContaining([
        [emails.viewer, 'joined'],
        [emails.maker, 'joined'],
      ]),
    )

    const promoted = await api('put', `/spaces/${spaceId}/members/${members.maker}`, { permissions: ['create', 'manage'] })

    expect(promoted.body.data.permissions).toEqual(['view', 'create', 'manage'])
    expect((await api('put', `/spaces/${spaceId}/members/${members.viewer}`, { permissions: ['manage'] }, 'maker')).status).toBe(403)
    expect((await api('put', `/spaces/${spaceId}/members/${members.viewer}`, { permissions: ['create'] }, 'maker')).status).toBe(200)
    expect((await api('put', `/spaces/${spaceId}`, { name: 'Family photos' }, 'maker')).status).toBe(200)
    expect((await api('put', `/spaces/${spaceId}`, { visibility: 'public' }, 'maker')).status).toBe(403)
    expect((await api('delete', `/spaces/${spaceId}`, undefined, 'maker')).status).toBe(404)
  })

  it('caps members per space on the owner’s plan', async () => {
    const third = await api('post', `/spaces/${spaceId}/members`, { email: emails.extra })
    const fourth = await api('post', `/spaces/${spaceId}/members`, { email: `nobody-${Date.now()}@toneflix.test` })

    expect(third.status).toBe(201)
    expect(fourth.status).toBe(422)
    expect(fourth.body.errors.email).toBeTruthy()

    members.extra = third.body.data.id

    const declined = await api('delete', `/account/space-invites/${members.extra}`, undefined, 'extra')

    expect(declined.status).toBe(200)
    expect((await api('post', `/spaces/${spaceId}/members`, { email: `again-${Date.now()}@toneflix.test` })).status).toBe(201)
  })

  it('lets members leave, and takes their work out of the space when they go', async () => {
    const left = await api('delete', `/spaces/${spaceId}/members/${members.viewer}`, undefined, 'viewer')

    expect(left.status).toBe(200)
    expect((await api('get', `/explore/spaces/${slug}`, undefined, 'viewer')).status).toBe(404)

    const removed = await api('delete', `/spaces/${spaceId}/members/${members.maker}`)

    expect(removed.status).toBe(200)
    expect((await api('get', `/photos/${makerPhotoId}`, undefined, 'maker')).body.data.spaceId).toBeNull()
    expect(ids(await api('get', `/explore/photos?space=${slug}`))).toEqual([photoId])
  })
})
