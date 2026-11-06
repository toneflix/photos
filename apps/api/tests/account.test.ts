import { beforeAll, describe, expect, it } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'

import { app } from '../src/core/bootstrap'
import path from 'node:path'
import request from 'parasito'
import { totp, wrongCode } from './support/totp'

const email = `account-${Date.now()}@toneflix.test`
const desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const phone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

let token = ''

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, agent = desktop) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json', 'User-Agent': agent })

  if (token) call.set('Authorization', `Bearer ${token}`)

  return body ? call.send(body) : call
}

/** The HTML of the newest email sent to `to` by the file mail transport. */
const lastMailTo = async (to: string) => {
  const root = path.join(process.cwd(), 'storage/framework/mails')
  const files = []

  for (const day of await readdir(root)) {
    for (const file of await readdir(path.join(root, day))) files.push(path.join(root, day, file))
  }

  for (const file of files.sort().reverse()) {
    const { message } = JSON.parse(await readFile(file, 'utf8'))

    if (message.to.includes(to)) return message.html as string
  }

  throw new Error(`No mail sent to ${to}`)
}

describe('account', () => {
  beforeAll(async () => {
    const res = await api('post', '/auth/register', { name: 'Test Person', email, password: 'password123' })

    token = res.body.data.token
  })

  it('starts unverified with private books by default', async () => {
    const res = await api('get', '/auth/me')

    expect(res.body.data).toMatchObject({ email, emailVerified: false, defaultVisibility: 'private', showOwnerName: true })
  })

  it('confirms the email from the emailed link alone', async () => {
    const html = await lastMailTo(email)
    const href = html.match(/href="([^"]*verify-email[^"]*)"/)![1]
    const params = new URL(href).searchParams

    expect(href).not.toContain('&')
    expect([...params.keys()]).toEqual(['token'])

    await api('post', '/auth/verify-email', { token: params.get('token'), email: 'someone-else@toneflix.test' }).expect(422)
    await api('post', '/auth/verify-email', { token: params.get('token') }).expect(200)

    const me = await api('get', '/auth/me')

    expect(me.body.data.emailVerified).toBe(true)
  })

  it('saves the profile and privacy choices', async () => {
    await api('put', '/account/profile', { name: 'Ada Person' }).expect(200)
    await api('put', '/account/privacy', { defaultVisibility: 'shared', showOwnerName: false }).expect(200)

    const book = await api('post', '/books', { title: 'Holiday' })
    const shared = await request(app).get(`/api/books/${book.body.data.id}`).set('Accept', 'application/json')

    expect(book.body.data.visibility).toBe('shared')
    expect(shared.body.data.owner.name).toBe('')

    await api('post', '/account/privacy/lock-books').contains('"updated":1')
  })

  it('lists signed-in devices and signs out the others', async () => {
    const current = token

    token = ''
    await api('post', '/auth/login', { email, password: 'password123' }, phone).expect(200)
    token = current

    const sessions = await api('get', '/account/sessions')

    expect(sessions.body.data).toHaveLength(2)
    expect(sessions.body.data.filter((session: { current: boolean }) => session.current)).toHaveLength(1)

    await api('delete', '/account/sessions').contains('"revoked":1')
  })

  it('needs the current password to change it', async () => {
    await api('put', '/account/password', {
      currentPassword: 'wrong-password',
      password: 'password456',
      password_confirmation: 'password456',
    }).expect(422)

    await api('put', '/account/password', {
      currentPassword: 'password123',
      password: 'password456',
      password_confirmation: 'password456',
    }).expect(200)
  })

  it('resets a forgotten password with an emailed link', async () => {
    await api('post', '/auth/forgot-password', { email }).expect(200)

    const html = await lastMailTo(email)

    expect(html).toContain('>Reset your password</h1>')
    expect(html).toContain('/brand/toneflix-mark.png')

    const link = new URL(html.match(/href="([^"]*reset-password[^"]*)"/)![1].replace(/&#38;/g, '&')).searchParams.get('token')

    await api('post', '/auth/reset-password', { token: link, password: 'password789', password_confirmation: 'password789' }).expect(200)
    await api('post', '/auth/reset-password', { token: link, password: 'password789', password_confirmation: 'password789' }).expect(422)
    await api('get', '/auth/me').expect(401)

    token = ''
    token = (await api('post', '/auth/login', { email, password: 'password789' })).body.data.token
  })

  it('asks for an authenticator code once two-step sign-in is on', async () => {
    const setup = await api('post', '/account/two-factor/setup')
    const secret = setup.body.data.secret
    const enabled = await api('post', '/account/two-factor', { code: totp(secret) })

    expect(enabled.body.data.recoveryCodes).toHaveLength(8)

    const current = token

    token = ''
    const login = await api('post', '/auth/login', { email, password: 'password789' }, phone)

    expect(login.body.data.twoFactor).toBe(true)

    const challengeToken = login.body.data.challengeToken
    const [recoveryCode] = enabled.body.data.recoveryCodes

    await api('post', '/auth/two-factor', { challengeToken, code: wrongCode(secret) }, phone).expect(422)
    await api('post', '/auth/two-factor', { challengeToken, recoveryCode }, phone).expect(200)
    await api('post', '/auth/two-factor', { challengeToken, recoveryCode }, phone).expect(422)
    await api('post', '/auth/two-factor', { challengeToken, code: totp(secret) }, phone).expect(200)

    token = current
    await api('delete', '/account/two-factor', { password: 'password789' }).contains('"enabled":false')
  })

  it('exports everything as a zip', async () => {
    const res = await api('get', '/account/export')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/zip')
  })

  it('deletes the account only with the password', async () => {
    await api('delete', '/account', { password: 'nope' }).expect(422)
    await api('delete', '/account', { password: 'password789' }).expect(200)
    await api('get', '/auth/me').expect(401)
  })
})
