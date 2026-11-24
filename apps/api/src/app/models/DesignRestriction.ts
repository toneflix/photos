import type { DesignKind } from '@app/policies/Design'
import { Model } from '@arkstack/database'
import type { Plan } from './Plan'
import type { QueryBuilder } from 'arkormx'

/** One book design (a page layout or frame) that only the listed plans can use. Designs without one are on every plan. */
export class DesignRestriction extends Model {
  declare id: string
  declare kind: DesignKind
  declare design: string
  declare planIds: string[]
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'design_restrictions'

  protected static override columns = {
    planIds: 'plan_ids',
  }

  protected override casts = {
    planIds: 'json',
  } as never

  scopeOfKind(query: QueryBuilder<DesignRestriction>, kind: DesignKind): QueryBuilder<DesignRestriction> {
    return query.where({ kind })
  }

  allows(plan: Plan): boolean {
    return !!plan.id && (this.planIds ?? []).includes(plan.id)
  }
}
