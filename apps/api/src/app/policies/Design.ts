import { FRAME_STYLES, PAGE_LAYOUTS } from '@toneflix/flipbook-core'
import { Cache } from '@arkstack/cache'
import { DesignRestriction } from '@app/models/DesignRestriction'
import type { Plan } from '@app/models/Plan'

export type DesignKind = 'layout' | 'frame'

export interface DesignKindDefinition {
  kind: DesignKind
  title: string
  /** What an account sees when it picks a design its plan doesn't include. */
  message: string
  designs: Record<string, { label: string }>
}

/**
 * The book designs admins can keep to some plans, by kind. A design is on every plan until
 * admins restrict it; a restricted design is only on the plans it lists.
 */
export class Design {
  static readonly KINDS: DesignKindDefinition[] = [
    {
      kind: 'layout',
      title: 'Page layouts',
      message: 'Some of these page layouts are not included in your plan.',
      designs: PAGE_LAYOUTS,
    },
    {
      kind: 'frame',
      title: 'Frames',
      message: 'This frame is not included in your plan.',
      designs: FRAME_STYLES,
    },
  ]

  /** Layouts the seeded Premium plan keeps to itself. */
  static readonly PREMIUM_LAYOUTS = ['collage', 'triptych', 'mosaic', 'strip', 'contact', 'scatter', 'story', 'feature', 'squares', 'aside', 'opener']

  static readonly CACHE_KEY = 'designs:restrictions'

  static find(kind: string): DesignKindDefinition | undefined {
    return Design.KINDS.find((definition) => definition.kind === kind)
  }

  static keys(kind: DesignKind): string[] {
    return Object.keys(Design.find(kind)!.designs)
  }

  /** Every restriction as plan ids by kind and design. Designs that aren't listed are on every plan. */
  static async restrictions(): Promise<Record<string, string[]>> {
    return Cache.remember(Design.CACHE_KEY, 300, async () => {
      const rows = await DesignRestriction.query().get()

      return Object.fromEntries(rows.all().map((row) => [`${row.kind}:${row.design}`, row.planIds ?? []]))
    })
  }

  /** The plans that may use a design, or null when every plan may. */
  static async plansFor(kind: DesignKind, design: string): Promise<string[] | null> {
    return (await Design.restrictions())[`${kind}:${design}`] ?? null
  }

  /** The designs of a kind that `plan` includes, in catalogue order. */
  static async allowed(kind: DesignKind, plan: Plan): Promise<string[]> {
    const restrictions = await Design.restrictions()

    return Design.keys(kind).filter((design) => {
      const plans = restrictions[`${kind}:${design}`]

      return !plans || (!!plan.id && plans.includes(plan.id))
    })
  }

  /** Keep a design to `planIds`, or open it to every plan with null. */
  static async restrict(kind: DesignKind, design: string, planIds: string[] | null): Promise<void> {
    const row = await DesignRestriction.scope('ofKind', kind).where({ design }).first()

    if (planIds === null) {
      await row?.delete()
    } else if (row) {
      row.planIds = [...new Set(planIds)]
      await row.save()
    } else {
      await DesignRestriction.query().create({ kind, design, planIds: [...new Set(planIds)] } as never)
    }

    await Cache.forget(Design.CACHE_KEY)
  }

  /** Add `plan` to the restrictions on `designs`, restricting the ones that aren't yet. */
  static async include(plan: Plan, kind: DesignKind, designs: string[]): Promise<void> {
    for (const design of designs) {
      const plans = (await Design.plansFor(kind, design)) ?? []

      if (!plans.includes(plan.id)) await Design.restrict(kind, design, [...plans, plan.id])
    }
  }
}
