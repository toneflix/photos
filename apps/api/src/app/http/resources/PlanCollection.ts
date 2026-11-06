import { Collection } from './Collection'
import type { Plan } from '@app/models/Plan'
import { PlanResource } from './PlanResource'

export class PlanCollection extends Collection {
  collects = PlanResource

  private country: string | null = null

  /** Show prices for a payer in `country`. */
  from(country: string | null) {
    this.country = country

    return this
  }

  data() {
    return (this.resource as Plan[]).map((plan) => new PlanResource(plan).from(this.country).data())
  }
}
