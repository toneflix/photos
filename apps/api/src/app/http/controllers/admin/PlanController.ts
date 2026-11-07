import { AdminPlanCollection } from '@app/http/resources/AdminPlanCollection'
import { AdminPlanResource } from '@app/http/resources/AdminPlanResource'
import { BaseController } from '../BaseController'
import { Feature } from '@app/policies/Feature'
import { Plan, type PlanDetails } from '@app/models/Plan'
import { regex } from 'kanun'

const SLUG = regex(Plan.SLUG)
const CURRENCY = regex(/^[A-Za-z]{3}$/)

/** Every field a plan form sends. Feature values are checked against each feature's type. */
const rules = (creating: boolean) => ({
  name: `${creating ? 'required' : 'nullable'}|string|max:100`,
  description: 'nullable|string|max:500',
  price: `${creating ? 'required' : 'nullable'}|numeric|min:0|max:99999999`,
  currency: ['nullable', 'string', CURRENCY],
  interval: `nullable|in:${Plan.INTERVALS.join(',')}`,
  intervalCount: 'nullable|integer|min:1|max:120',
  billingOptions: 'nullable|array|max:10',
  'billingOptions.*.cycles': 'required|integer|min:2|max:120',
  'billingOptions.*.discount': 'required|numeric|min:0|max:100',
  'billingOptions.*.name': 'nullable|string|max:40',
  isDefault: 'nullable|boolean',
  active: 'nullable|boolean',
  isHidden: 'nullable|boolean',
  sort: 'nullable|integer|min:0|max:1000',
  features: 'nullable|object',
  ...Object.fromEntries(
    Feature.ALL.flatMap((feature) => [
      [`features.${feature.key}.value`, feature.type === 'toggle' ? 'nullable|boolean' : 'nullable|integer|min:0'],
      [`features.${feature.key}.active`, 'nullable|boolean'],
      [`features.${feature.key}.listed`, 'nullable|boolean'],
    ]),
  ),
})

/** Only the fields that were sent, so a missing field keeps what the plan has. */
const details = (data: Record<string, any>): PlanDetails =>
  Object.fromEntries(
    Object.entries({
      name: data.name,
      description: data.description,
      price: data.price === undefined || data.price === null ? undefined : Number(data.price),
      currency: data.currency,
      interval: data.interval,
      intervalCount: data.intervalCount ? Number(data.intervalCount) : undefined,
      billingOptions: data.billingOptions,
      isDefault: data.isDefault ?? undefined,
      active: data.active ?? undefined,
      isHidden: data.isHidden ?? undefined,
      sort: data.sort === undefined || data.sort === null ? undefined : Number(data.sort),
      features: data.features ?? undefined,
    }).filter(([key, value]) => value !== undefined || (key === 'description' && 'description' in data)),
  )

/** Admins make plans out of the feature catalogue and choose what each grants or limits. */
export default class PlanController extends BaseController {
  /** Every plan in the order admins set, with the catalogue of features to choose from. */
  async index() {
    const plans = (await Plan.scope('ordered').get()).all()

    return new AdminPlanCollection(plans).additional({ status: 'success', message: 'OK', code: 200, features: Feature.ALL })
  }

  async create() {
    const data = await this.validate({
      ...rules(true),
      slug: ['nullable', 'string', 'min:2', 'max:40', SLUG, 'unique:plans,slug'],
    })

    const plan = await Plan.open({ ...details(data), name: String(data.name), price: Number(data.price), slug: data.slug })

    return new AdminPlanResource(plan).additional({ status: 'success', message: `${plan.name} created`, code: 201 }).response().setStatusCode(201)
  }

  async update() {
    const plan = await Plan.query().findOrFail(String(this.params.plan))
    const data = await this.validate(rules(false))

    await plan.revise(details(data))

    return new AdminPlanResource(plan).additional({ status: 'success', message: `${plan.name} saved`, code: 200 })
  }

  /** Delete a plan nobody has had. A plan with history is turned off instead. */
  async destroy() {
    const plan = await Plan.query().findOrFail(String(this.params.plan))
    const deleted = await plan.remove()
    const message = deleted ? `${plan.name} deleted` : `${plan.name} has been paid for, so it was turned off instead of deleted`

    return new AdminPlanResource(plan).additional({ status: 'success', message, code: 200, deleted })
  }
}
