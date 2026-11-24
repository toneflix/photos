import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { execFileSync } from 'node:child_process'
import { putOnPlan, seedPlans } from './support/plans'
import request from 'parasito'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as: string | null = 'admin') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

describe('Book designs on plans', () => {
  let premium = ''

  beforeAll(async () => {
    seedPlans()

    for (const who of ['admin', 'free', 'paid']) {
      const email = `designs-${who}-${Date.now()}@toneflix.test`
      const register = await api('post', '/auth/register', { name: `Designs ${who}`, email, password: 'password123' }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') execFileSync('npx', ['ark', 'users:role', email, 'admin'], { cwd: process.cwd(), encoding: 'utf8' })
      if (who === 'paid') putOnPlan(email)
    }

    premium = (await api('get', '/admin/plans')).body.data.find((plan: { slug: string }) => plan.slug === 'premium').id
  }, 60_000)

  afterAll(async () => {
    await api('put', '/admin/designs/frame/woodgrain', { planIds: null })
  })

  it('lists every layout and frame with the plans each is kept to', async () => {
    const res = await api('get', '/admin/designs')
    const layouts = res.body.data.find((kind: { kind: string }) => kind.kind === 'layout')
    const frames = res.body.data.find((kind: { kind: string }) => kind.kind === 'frame')

    expect(res.status).toBe(200)
    expect(layouts.designs).toContainEqual({ key: 'grid', label: 'Grid', planIds: null })
    expect(layouts.designs).toContainEqual(expect.objectContaining({ key: 'mosaic', planIds: [premium] }))
    expect(frames.designs).toContainEqual(expect.objectContaining({ key: 'woodgrain' }))
  })

  it('keeps restricting designs to admins who manage plans', async () => {
    const res = await api('put', '/admin/designs/frame/woodgrain', { planIds: [premium] }, 'free')

    expect(res.status).toBe(403)
  })

  it('rejects designs and plans that do not exist', async () => {
    const design = await api('put', '/admin/designs/frame/neon', { planIds: null })
    const plan = await api('put', '/admin/designs/frame/woodgrain', { planIds: ['3f1f2b3c-0000-4000-8000-000000000000'] })
    const junk = await api('put', '/admin/designs/frame/woodgrain', { planIds: ['nope'] })

    expect(design.status).toBe(404)
    expect(plan.status).toBe(422)
    expect(junk.status).toBe(422)
  })

  it('keeps a restricted frame to the plans it lists, and opens it again', async () => {
    const restrict = await api('put', '/admin/designs/frame/woodgrain', { planIds: [premium] })
    const free = await api('post', '/books', { title: 'Wood', frame: 'woodgrain' }, 'free')
    const paid = await api('post', '/books', { title: 'Wood', frame: 'woodgrain' }, 'paid')
    const plain = await api('post', '/books', { title: 'Plain' }, 'free')
    const page = await api('put', `/books/${plain.body.data.id}/pages`, { pages: [{ layout: 'framed', frame: 'woodgrain' }] }, 'free')
    const detail = await api('get', `/books/${plain.body.data.id}`, undefined, 'free')

    expect(restrict.status).toBe(200)
    expect(restrict.body.data.designs).toContainEqual(expect.objectContaining({ key: 'woodgrain', planIds: [premium] }))
    expect(free.status).toBe(422)
    expect(free.body.errors.frame[0]).toContain('not included in your plan')
    expect(paid.status).toBe(201)
    expect(page.status).toBe(422)
    expect(detail.body.data.framesAllowed).not.toContain('woodgrain')
    expect(detail.body.data.framesAllowed).toContain('hairline')

    await api('put', '/admin/designs/frame/woodgrain', { planIds: null })

    const reopened = await api('post', '/books', { title: 'Wood again', frame: 'woodgrain' }, 'free')

    expect(reopened.status).toBe(201)
  })

  it('lets a book keep a design its plan no longer includes', async () => {
    const book = (await api('post', '/books', { title: 'Kept', frame: 'woodgrain' }, 'free')).body.data.id

    await api('put', '/admin/designs/frame/woodgrain', { planIds: [premium] })

    const same = await api('put', `/books/${book}`, { frame: 'woodgrain', title: 'Kept still' }, 'free')

    expect(same.status).toBe(200)
  })
})
