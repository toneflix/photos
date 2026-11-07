import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { app } from '../src/core/bootstrap'
import { execFileSync } from 'node:child_process'
import request from 'parasito'
import { seedPlans } from './support/plans'

const tokens: Record<string, string> = {}
const accounts: Record<string, { id: string; email: string }> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'admin', headers: Record<string, string> = {}) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json', ...headers })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

/** What the fake Flutterwave answers when a payment is verified, by reference. */
const verified: Record<string, { status: string; amount: number; currency: string }> = {}
const started: Array<Record<string, any>> = []
const realFetch = globalThis.fetch

const flutterwave = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
  const url = String(input instanceof Request ? input.url : input)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  if (url === 'https://flutterwave.test/v3/payments') {
    const body = JSON.parse(String(init?.body))

    started.push(body)

    return json({ status: 'success', data: { link: `https://checkout.flutterwave.test/pay/${body.tx_ref}` } })
  }

  if (url.startsWith('https://flutterwave.test/v3/transactions/verify_by_reference')) {
    const reference = new URL(url).searchParams.get('tx_ref')!
    const answer = verified[reference]

    return answer ? json({ status: 'success', data: { tx_ref: reference, ...answer } }) : json({ status: 'error', message: 'No transaction was found' }, 404)
  }

  if (url === 'https://v6.exchangerate-api.com/v6/test-key/pair/NGN/KES/1') return json({ result: 'success', conversion_rate: 0.08, conversion_result: 0.08 })

  return realFetch(input, init)
})

describe('Plans admin and checkout', () => {
  let regionId = ''

  beforeAll(async () => {
    seedPlans()

    for (const who of ['admin', 'payer', 'member']) {
      const email = `pay-${who}-${Date.now()}@toneflix.test`
      const register = await api('post', '/auth/register', { name: `Pay ${who}`, email, password: 'password123' }, null)

      tokens[who] = register.body.data.token
      accounts[who] = { id: register.body.data.user.id, email }
    }

    execFileSync('npx', ['ark', 'users:role', accounts.admin.email, 'admin'], { cwd: process.cwd(), encoding: 'utf8' })
  }, 60_000)

  afterAll(async () => {
    if (regionId) await api('delete', `/admin/payment-regions/${regionId}`)

    flutterwave.mockRestore()
  })

  it('keeps plans and regions to admins who manage plans', async () => {
    expect((await api('get', '/admin/plans', undefined, 'member')).status).toBe(403)
    expect((await api('get', '/admin/payment-regions', undefined, 'member')).status).toBe(403)
    expect((await api('put', `/admin/users/${accounts.payer.id}/plan`, { plan: 'premium' }, 'member')).status).toBe(403)
  })

  it('lets admins make plans and choose what each feature does', async () => {
    const list = await api('get', '/admin/plans')
    const created = await api('post', '/admin/plans', {
      name: 'Studio test',
      price: 12000,
      sort: 50,
      billingOptions: [{ cycles: 6, discount: 10 }],
      features: { max_books: { value: 50 }, book_zip: { value: true, listed: false }, badge: { value: true, active: false } },
    })
    const plan = created.body.data

    expect(list.status).toBe(200)
    expect(list.body.features.map((feature: { key: string }) => feature.key)).toContain('custom_imprint')
    expect(created.status).toBe(201)
    expect(plan.slug).toBe('studio-test')
    expect(plan.billing.map((option: { cycles: number }) => option.cycles)).toEqual([1, 6])
    expect(plan.features.find((feature: { key: string }) => feature.key === 'book_zip')).toMatchObject({ value: true, active: true, listed: false })
    expect(plan.features.find((feature: { key: string }) => feature.key === 'badge')).toMatchObject({ value: false, active: false })

    const offered = (await api('get', '/plans', undefined, null)).body.data.find((item: { slug: string }) => item.slug === 'studio-test')

    expect(offered.features.map((feature: { key: string }) => feature.key)).toContain('max_books')
    expect(offered.features.map((feature: { key: string }) => feature.key)).not.toContain('book_zip')

    const hidden = await api('put', `/admin/plans/${plan.id}`, { isHidden: true })
    const paidDefault = await api('put', `/admin/plans/${plan.id}`, { isDefault: true })
    const removed = await api('delete', `/admin/plans/${plan.id}`)

    expect(hidden.body.data.isHidden).toBe(true)
    expect((await api('get', '/plans', undefined, null)).body.data.map((item: { slug: string }) => item.slug)).not.toContain('studio-test')
    expect(paidDefault.status).toBe(422)
    expect(paidDefault.body.errors.isDefault[0]).toBe('The default plan must be free.')
    expect(removed.body.deleted).toBe(true)
  })

  it('lists plans in the order admins set, even before cheaper ones', async () => {
    const created = await api('post', '/admin/plans', { name: 'Order test', price: 99999, sort: 0 })
    const plan = created.body.data
    const slugs = async (path: string) => (await api('get', path, undefined, path.startsWith('/admin') ? 'admin' : null)).body.data.map((item: { slug: string }) => item.slug)
    const before = await slugs('/plans')

    await api('put', `/admin/plans/${plan.id}`, { sort: 1000 })

    const after = await slugs('/plans')
    const admin = await slugs('/admin/plans')

    await api('delete', `/admin/plans/${plan.id}`)

    expect(before.indexOf('order-test')).toBeLessThan(before.indexOf('premium'))
    expect(after.at(-1)).toBe('order-test')
    expect(admin.at(-1)).toBe('order-test')
  })

  it('prices plans in the currency of the payer’s region', async () => {
    const region = await api('post', '/admin/payment-regions', { name: 'Ghana test', countries: ['qz'], currency: 'ghs', exchangeRate: 0.0123 })
    const overlap = await api('post', '/admin/payment-regions', { name: 'West Africa test', countries: ['QZ', 'QY'], currency: 'XOF' })

    regionId = region.body.data.id

    expect(region.status).toBe(201)
    expect(region.body.data).toMatchObject({ countries: ['QZ'], currency: 'GHS' })
    expect(overlap.status).toBe(422)
    expect(overlap.body.errors.countries[0]).toContain('Ghana test')

    const home = (await api('get', '/plans', undefined, null)).body.data.find((plan: { slug: string }) => plan.slug === 'premium')
    const ghana = (await api('get', '/plans', undefined, null, { 'X-Country': 'QZ' })).body.data.find((plan: { slug: string }) => plan.slug === 'premium')

    expect(home.chargeCurrency).toBe('NGN')
    expect(home.billing[0].charge).toBe(home.price)
    expect(ghana.chargeCurrency).toBe('GHS')
    expect(ghana.billing[0].charge).toBe(Math.ceil(home.price * 0.0123 * 100) / 100)
  })

  it('uses the live rate and markup when a region has no fixed rate', async () => {
    const kenya = await api('post', '/admin/payment-regions', { name: 'Kenya test', countries: ['QX'], currency: 'KES', rateMarkup: 5 })
    const premium = (await api('get', '/plans?country=QX', undefined, null)).body.data.find((plan: { slug: string }) => plan.slug === 'premium')

    await api('delete', `/admin/payment-regions/${kenya.body.data.id}`)

    expect(premium.chargeCurrency).toBe('KES')
    expect(premium.billing[0].charge).toBe(Math.ceil(Math.round(premium.price * 0.08 * 1.05 * 10_000) / 100) / 100)
  })

  it('sends payers to Flutterwave and gives them the plan once paid', async () => {
    const start = await api('post', '/payments', { plan: 'premium', cycles: 12 }, 'payer', { 'X-Country': 'QZ' })
    const payment = start.body.data

    expect(start.status).toBe(201)
    expect(payment).toMatchObject({ status: 'pending', cycles: 12, chargeCurrency: 'GHS', currency: 'NGN' })
    expect(payment.checkoutUrl).toBe(`https://checkout.flutterwave.test/pay/${payment.reference}`)
    expect(started.at(-1)).toMatchObject({ tx_ref: payment.reference, currency: 'GHS', amount: payment.chargeAmount, customer: { email: accounts.payer.email } })
    expect(started.at(-1)!.redirect_url).toContain(`/checkout/complete?reference=${payment.reference}`)

    const waiting = await api('post', `/payments/${payment.reference}/verify`, undefined, 'payer')

    expect(waiting.body.data.status).toBe('pending')

    verified[payment.reference] = { status: 'successful', amount: payment.chargeAmount, currency: 'GHS' }

    const paid = await api('post', `/payments/${payment.reference}/verify`, undefined, 'payer')
    const again = await api('post', `/payments/${payment.reference}/verify`, undefined, 'payer')
    const plan = await api('get', '/account/plan', undefined, 'payer')
    const history = await api('get', '/account/payments', undefined, 'payer')

    expect(paid.body.data.status).toBe('complete')
    expect(again.body.data.status).toBe('complete')
    expect(plan.body.data).toMatchObject({ premium: true, plan: { slug: 'premium' } })
    expect(new Date(plan.body.data.endsAt).getTime()).toBeGreaterThan(Date.now() + 360 * 24 * 3600 * 1000)
    expect(history.body.data.map((item: { reference: string }) => item.reference)).toEqual([payment.reference])
  })

  it('turns away payments that come up short or that someone else made', async () => {
    const start = (await api('post', '/payments', { plan: 'premium' }, 'member')).body.data

    expect((await api('post', `/payments/${start.reference}/verify`, undefined, 'payer')).status).toBe(404)

    verified[start.reference] = { status: 'successful', amount: start.chargeAmount - 1, currency: start.chargeCurrency }

    const short = await api('post', `/payments/${start.reference}/verify`, undefined, 'member')

    expect(short.body.data.status).toBe('rejected')
    expect((await api('get', '/account/plan', undefined, 'member')).body.data.premium).toBe(false)
    expect((await api('post', '/payments', { plan: 'free' }, 'member')).status).toBe(422)
    expect((await api('post', '/payments', { plan: 'premium', cycles: 5 }, 'member')).status).toBe(422)
  })

  it('settles payments from signed Flutterwave webhooks only', async () => {
    const start = (await api('post', '/payments', { plan: 'premium' }, 'member')).body.data
    const event = { event: 'charge.completed', data: { tx_ref: start.reference, status: 'successful' } }

    verified[start.reference] = { status: 'successful', amount: start.chargeAmount, currency: start.chargeCurrency }

    expect((await api('post', '/payments/flutterwave/webhook', event, null, { 'verif-hash': 'wrong' })).status).toBe(401)
    expect((await api('get', '/account/plan', undefined, 'member')).body.data.premium).toBe(false)
    expect((await api('post', '/payments/flutterwave/webhook', event, null, { 'verif-hash': 'test-webhook-hash' })).status).toBe(200)
    expect((await api('get', '/account/plan', undefined, 'member')).body.data.premium).toBe(true)
  })

  it('lets admins put an account on a plan and take it off', async () => {
    const given = await api('put', `/admin/users/${accounts.member.id}/plan`, { plan: 'premium', cycles: 2 })
    const taken = await api('put', `/admin/users/${accounts.member.id}/plan`, { plan: 'free' })

    expect(given.body.data.plan).toMatchObject({ slug: 'premium' })
    expect(taken.body.data.plan).toMatchObject({ slug: 'free', endsAt: null })
  })
})
