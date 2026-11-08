import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { execFileSync } from 'node:child_process'
import request from 'parasito'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'admin') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

describe('Pages and policies', () => {
  beforeAll(async () => {
    execFileSync('npx', ['ark', 'seed', 'DocumentSeeder'], { cwd: process.cwd(), encoding: 'utf8' })

    for (const who of ['admin', 'member']) {
      const email = `documents-${who}-${Date.now()}@toneflix.test`
      const register = await api('post', '/auth/register', { name: `Documents ${who}`, email, password: 'password123' }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') execFileSync('npx', ['ark', 'users:role', email, 'admin'], { cwd: process.cwd(), encoding: 'utf8' })
    }
  }, 60_000)

  it('shows the built-in pages to everyone', async () => {
    const list = await api('get', '/documents', undefined, null)
    const privacy = await api('get', '/documents/privacy', undefined, null)

    expect(list.status).toBe(200)
    expect(list.body.data.map((document: { slug: string }) => document.slug)).toEqual(expect.arrayContaining(['about', 'privacy', 'terms']))
    expect(list.body.data[0]).not.toHaveProperty('body')
    expect(privacy.status).toBe(200)
    expect(privacy.body.data).toMatchObject({ slug: 'privacy', type: 'policy', builtIn: true, published: true })
    expect(privacy.body.data.body).toContain('## What we collect')
  })

  it('lists one type at a time', async () => {
    const policies = await api('get', '/documents?type=policy', undefined, null)

    expect(policies.body.data.every((document: { type: string }) => document.type === 'policy')).toBe(true)
  })

  it('lets admins write pages that only show once published', async () => {
    const created = await api('post', '/admin/documents', { title: `Community guidelines ${Date.now()}`, body: '# Be kind', type: 'policy' })
    const slug = created.body.data.slug

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ published: false, builtIn: false, type: 'policy' })
    expect((await api('get', `/documents/${slug}`, undefined, null)).status).toBe(404)

    const published = await api('put', `/admin/documents/${created.body.data.id}`, { published: true, summary: 'How to behave' })

    expect(published.body.data).toMatchObject({ published: true, summary: 'How to behave' })
    expect((await api('get', `/documents/${slug}`, undefined, null)).body.data.body).toBe('# Be kind')
    expect((await api('delete', `/admin/documents/${created.body.data.id}`)).status).toBe(200)
    expect((await api('get', `/documents/${slug}`, undefined, null)).status).toBe(404)
  })

  it('keeps built-in pages published, at their address and in place', async () => {
    const terms = (await api('get', '/documents/terms', undefined, null)).body.data

    expect((await api('put', `/admin/documents/${terms.id}`, { published: false })).status).toBe(422)
    expect((await api('put', `/admin/documents/${terms.id}`, { slug: 'rules' })).status).toBe(422)
    expect((await api('delete', `/admin/documents/${terms.id}`)).status).toBe(422)
  })

  it('refuses an address another page uses', async () => {
    const response = await api('post', '/admin/documents', { title: 'Another about', slug: 'about', body: 'Hi' })

    expect(response.status).toBe(422)
    expect(response.body.errors).toHaveProperty('slug')
  })

  it('keeps members out of the editor', async () => {
    expect((await api('get', '/admin/documents', undefined, 'member')).status).toBe(403)
    expect((await api('post', '/admin/documents', { title: 'Mine', body: 'x' }, 'member')).status).toBe(403)
  })
})
