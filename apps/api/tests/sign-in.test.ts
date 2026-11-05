import { describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { createHmac } from 'node:crypto'
import request from 'parasito'

const api = (path: string, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  request(app).post(`/api${path}`).set({ Accept: 'application/json', ...headers }).send(body)

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

describe('Sign-in edge cases', () => {
  const email = `edge-${Date.now()}@toneflix.test`

  it('treats an email in another case as the same account', async () => {
    await api('/auth/register', { name: 'Edge Case', email, password: 'password123' }).expect(201)

    const again = await api('/auth/register', { name: 'Edge Case', email: `  ${email.toUpperCase()} `, password: 'password123' })

    expect(again.status).toBe(422)
    expect(again.body.errors.email[0]).toBe('The email has already been taken.')

    await api('/auth/login', { email: ` ${email.toUpperCase()}`, password: 'password123' }).expect(200)
  })

  it('answers the same for an unknown email and a wrong password', async () => {
    const unknown = await api('/auth/login', { email: `nobody-${Date.now()}@toneflix.test`, password: 'password123' })
    const wrong = await api('/auth/login', { email, password: 'not-the-password' })

    expect(unknown.status).toBe(422)
    expect(unknown.body).toEqual(wrong.body)
    expect(wrong.body.errors).toEqual({ password: ['Email or password is not right'] })
  })

  it('accepts each authenticator code only once', async () => {
    const login = await api('/auth/login', { email, password: 'password123' })
    const auth = { Authorization: `Bearer ${login.body.data.token}` }
    const setup = await request(app).post('/api/account/two-factor/setup').set({ Accept: 'application/json', ...auth })

    await api('/account/two-factor', { code: totp(setup.body.data.secret) }, auth).expect(200)

    const code = totp(setup.body.data.secret)
    const first = await api('/auth/login', { email, password: 'password123' })
    const second = await api('/auth/login', { email, password: 'password123' })

    await api('/auth/two-factor', { challengeToken: first.body.data.challengeToken, code }).expect(200)
    await api('/auth/two-factor', { challengeToken: second.body.data.challengeToken, code }).expect(422)
  })
})
