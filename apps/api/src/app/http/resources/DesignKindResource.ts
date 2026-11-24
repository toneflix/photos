import { Design, type DesignKindDefinition } from '@app/policies/Design'
import { Resource } from 'resora'

/** One kind of book design as admins restrict it: each design with the plans it is kept to, or null for every plan. */
export class DesignKindResource extends Resource {
  async data() {
    const definition = this.resource as DesignKindDefinition
    const restrictions = await Design.restrictions()

    return {
      kind: definition.kind,
      title: definition.title,
      designs: Object.entries(definition.designs).map(([key, { label }]) => ({
        key,
        label,
        planIds: restrictions[`${definition.kind}:${key}`] ?? null,
      })),
    }
  }
}
