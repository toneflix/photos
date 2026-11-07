import { Migration, SchemaBuilder, where } from 'arkormx'
import { Plan } from 'src/app/models/Plan'

export default class AddHighlightToPlansTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('plans', (table) => {
      table.boolean('isHighlighted').default(false).map('is_highlighted')
    })
  }

  /** The first paid plan on offer starts as the highlighted one. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    const plan = await Plan.scope('onOffer')
      .where(where('price', '>', 0))
      .first()

    if (plan) await plan.revise({ isHighlighted: true })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('plans', (table) => {
      table.dropColumn('isHighlighted')
    })
  }
}
