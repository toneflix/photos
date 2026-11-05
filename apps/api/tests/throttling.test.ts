import { describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { createHmac } from 'node:crypto'
import request from 'parasito'

const api = (method: 'get' | 'post', path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json', ...headers })

  return body ? call.send(body) : call
}

const register = async (prefix: string) => {
  const email = `${prefix}-${Date.now()}@toneflix.test`
  const res = await api('post', '/auth/register', { name: 'Throttle Tester', email, password: 'password123' })

  return { email, token: res.body.data.token as string }
}

/** The current code an authenticator app would show for a base32 secret. */
const totp = (secret: string) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bits = [...secret].map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('')
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)))
  const counter = Buffer.alloc(8)

  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))

  const hash = createHmac('sha1', key).update(counter).digest()
  const offset = hash[hash.length - 1] & 15

  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

describe('Throttling', () => {
  it('locks an email out after five wrong passwords, even for the right one', async () => {
    const { email } = await register('lockout')
    const other = await register('lockout-other')

    for (let i = 0; i < 5; i++) await api('post', '/auth/login', { email, password: 'wrong-password' }).expect(422)

    const locked = await api('post', '/auth/login', { email, password: 'password123' })

    expect(locked.status).toBe(429)
    expect(locked.body.message).toMatch(/^Too many sign-in attempts\. Try again in 15 minutes\.$/)

    await api('post', '/auth/login', { email: other.email, password: 'password123' }).expect(200)
  })

  it('clears the count after a successful sign-in', async () => {
    const { email } = await register('clears')

    for (let i = 0; i < 4; i++) await api('post', '/auth/login', { email, password: 'wrong-password' }).expect(422)

    await api('post', '/auth/login', { email, password: 'password123' }).expect(200)

    for (let i = 0; i < 4; i++) await api('post', '/auth/login', { email, password: 'wrong-password' }).expect(422)

    await api('post', '/auth/login', { email, password: 'password123' }).expect(200)
  })

  it('locks two-step sign-in after five wrong codes', async () => {
    const { email, token } = await register('two-step')
    const auth = { Authorization: `Bearer ${token}` }
    const setup = await api('post', '/account/two-factor/setup', undefined, auth)

    await api('post', '/account/two-factor', { code: totp(setup.body.data.secret) }, auth).expect(200)

    const login = await api('post', '/auth/login', { email, password: 'password123' })
    const challengeToken = login.body.data.challengeToken

    for (let i = 0; i < 5; i++) await api('post', '/auth/two-factor', { challengeToken, code: '000000' }).expect(422)

    const locked = await api('post', '/auth/two-factor', { challengeToken, code: totp(setup.body.data.secret) })

    expect(locked.status).toBe(429)
    expect(locked.body.message).toContain('Too many wrong codes.')
  })

  it('stops trying access codes for a visitor who guessed wrong too often', async () => {
    const { token } = await register('codes')
    const auth = { Authorization: `Bearer ${token}` }
    const book = await api('post', '/books', { title: 'Locked away' }, auth)
    const code = await api('post', `/books/${book.body.data.id}/access-codes`, {}, auth)

    for (let i = 0; i < 20; i++) {
      await api('get', `/books/${book.body.data.id}`, undefined, { 'X-Access-Code': `WRNG-${String(i).padStart(4, '0')}` }).expect(404)
    }

    const redeem = await api('post', '/access-codes/redeem', { code: code.body.data.code })
    const open = await api('get', `/books/${book.body.data.id}`, undefined, { 'X-Access-Code': code.body.data.code })

    expect(redeem.status).toBe(429)
    expect(redeem.body.message).toContain('Too many wrong access codes.')
    expect(open.status).toBe(404)
  })
})
