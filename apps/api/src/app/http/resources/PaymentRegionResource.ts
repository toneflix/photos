import type { PaymentRegion } from '@app/models/PaymentRegion'
import { Resource } from 'resora'

/** A payment region as admins set it. */
export class PaymentRegionResource extends Resource {
  async data() {
    const region = this.resource as PaymentRegion

    return {
      id: region.id,
      name: region.name,
      countries: region.countries ?? [],
      currency: region.currency,
      exchangeRate: region.exchangeRate ?? null,
      rateMarkup: Number(region.rateMarkup ?? 0),
      active: region.active,
      createdAt: region.createdAt,
      updatedAt: region.updatedAt,
    }
  }
}
