import { BaseController } from '../BaseController'
import { Design } from '@app/policies/Design'
import { DesignKindCollection } from '@app/http/resources/DesignKindCollection'
import { DesignKindResource } from '@app/http/resources/DesignKindResource'
import { Plan } from '@app/models/Plan'
import { UUID_PATTERN } from '@app/support/rules'
import { ValidationException } from 'kanun'
import { abortIf, assertFound } from '@arkstack/common'

/** Admins keep page layouts and frames to some plans. */
export default class DesignController extends BaseController {
  async index() {
    const kinds = Design.KINDS

    return new DesignKindCollection(kinds).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Keep one design to the plans sent, or open it to every plan when `planIds` is null. */
  async update() {
    const definition = Design.find(String(this.params.kind))
    const design = String(this.params.design)

    assertFound(definition, 'There is no such kind of design.')
    abortIf(!definition.designs[design], 'There is no such design.', 404)

    const data = await this.validate({ planIds: 'present|nullable|array' })
    const planIds = data.planIds ? (data.planIds as unknown[]).map(String) : null

    if (planIds?.length) {
      const valid = planIds.filter((id) => UUID_PATTERN.test(id))
      const known = valid.length ? (await Plan.query().whereIn('id', valid as never).get()).all() : []

      if (known.length !== new Set(planIds).size) throw ValidationException.withMessages({ planIds: 'Some of these plans no longer exist.' })
    }

    await Design.restrict(definition.kind, design, planIds)

    return new DesignKindResource(definition).additional({ status: 'success', message: 'Saved', code: 200 })
  }
}
