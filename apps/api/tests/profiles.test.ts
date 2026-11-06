import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const api = (method: 'get' | 'post' | 'put', path: string, token = '', body?: Record<string, unknown>) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (token) call.set('Authorization', `Bearer ${token}`)

  return body ? call.send(body) : call
}

const ids = (res: { body: { data: { id: string }[] } }) => res.body.data.map((item) => item.id)

describe('Maker profiles', () => {
  let token = ''
  let visitor = ''
  let makerId = ''
  const photos: Record<string, string> = {}
  let bookId = ''

  const upload = async (name: string) => {
    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'pixel.png')

    const res = await request(app)
      .post('/api/photos')
      .set({ Accept: 'application/json', Authorization: `Bearer ${token}` })
      .send(form)

    photos[name] = res.body.data.id
  }

  const stamp = Date.now()

  beforeAll(async () => {
    const maker = await api('post', '/auth/register', '', { name: 'Pat Maker', email: `maker-${stamp}@toneflix.test`, password: 'password123' })
    const other = await api('post', '/auth/register', '', { name: 'Vic Visitor', email: `visitor-${stamp}@toneflix.test`, password: 'password123' })

    token = maker.body.data.token
    visitor = other.body.data.token
    makerId = maker.body.data.user.id

    await upload('shown')
    await upload('hidden')
    await upload('tucked')
    await api('put', `/photos/${photos.shown}`, token, { visibility: 'public' })

    const space = await api('post', '/spaces', token, { name: 'Private corner' })

    await api('put', `/photos/${photos.tucked}`, token, { visibility: 'public', spaceId: space.body.data.id })

    const book = await api('post', '/books', token, { title: 'Pat book' })

    bookId = book.body.data.id

    await api('put', `/books/${bookId}/pages`, token, { pages: [{ layout: 'single', photoIds: [photos.shown] }] })
    await api('put', `/books/${bookId}`, token, { visibility: 'public' })
  })

  it('shows a maker and counts only the work they show everyone', async () => {
    const profile = await api('get', `/explore/makers/${makerId}`)

    expect(profile.status).toBe(200)
    expect(profile.body.data).toMatchObject({ id: makerId, name: 'Pat Maker', photoCount: 1, bookCount: 1, spaceCount: 0, stats: null, isOwner: false })
    expect(profile.body.data).not.toHaveProperty('email')
  })

  it("lists the maker's public photos and books, never private ones or those in private spaces", async () => {
    const photoList = await api('get', `/explore/photos?maker=${makerId}`)
    const bookList = await api('get', `/explore/books?maker=${makerId}`)

    expect(ids(photoList)).toEqual([photos.shown])
    expect(ids(bookList)).toEqual([bookId])
    expect(ids(await api('get', `/explore/spaces?maker=${makerId}`))).toEqual([])
  })

  it('opens the profile and lists by username, made from the email address until the maker changes it', async () => {
    const username = `maker_${stamp}`
    const byUsername = await api('get', `/explore/makers/${username.toUpperCase()}`)

    expect(byUsername.status).toBe(200)
    expect(byUsername.body.data).toMatchObject({ id: makerId, username })
    expect(ids(await api('get', `/explore/photos?maker=${username}`))).toEqual([photos.shown])

    const changed = await api('put', '/account/profile', token, { name: 'Pat Maker', username: ` Pat_${stamp} ` })

    expect(changed.body.data.username).toBe(`pat_${stamp}`)
    expect((await api('get', `/explore/makers/pat_${stamp}`)).body.data.id).toBe(makerId)
    expect((await api('get', `/explore/makers/${username}`)).status).toBe(404)
  })

  it('keeps usernames unique and well formed', async () => {
    const other = await api('put', '/account/profile', visitor, { name: 'Vic Visitor', username: `pat_${stamp}` })
    const malformed = await api('put', '/account/profile', visitor, { name: 'Vic Visitor', username: 'vic-visitor' })
    const kept = await api('put', '/account/profile', token, { name: 'Pat Maker', username: `pat_${stamp}` })

    expect(other.status).toBe(422)
    expect(other.body.errors).toHaveProperty('username')
    expect(malformed.status).toBe(422)
    expect(kept.status).toBe(200)
  })

  it('shows counts to visitors only when the maker allows it, and always to the maker', async () => {
    await api('get', `/explore/photos/${photos.shown}`, visitor)

    expect((await api('get', `/explore/makers/${makerId}`, token)).body.data.stats).toEqual({ views: 1, downloads: 0 })

    await api('put', '/account/privacy', token, { showCounts: true })

    expect((await api('get', `/explore/makers/${makerId}`)).body.data.stats).toEqual({ views: 1, downloads: 0 })
  })

  it('has no profile for makers who keep their name off shared work, except for themselves', async () => {
    await api('put', '/account/privacy', token, { showOwnerName: false })

    expect((await api('get', `/explore/makers/${makerId}`)).status).toBe(404)
    expect((await api('get', `/explore/photos?maker=${makerId}`)).status).toBe(404)

    const own = await api('get', `/explore/makers/${makerId}`, token)

    expect(own.status).toBe(200)
    expect(own.body.data).toMatchObject({ isOwner: true, isListed: false })
  })

  it('answers 404 for unknown makers', async () => {
    expect((await api('get', '/explore/makers/nope')).status).toBe(404)
    expect((await api('get', '/explore/makers/00000000-0000-4000-8000-000000000000')).status).toBe(404)
    expect((await api('get', '/explore/photos?maker=nope')).status).toBe(404)
  })
})
