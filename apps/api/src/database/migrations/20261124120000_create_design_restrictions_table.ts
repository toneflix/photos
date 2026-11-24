import { DB, Migration, SchemaBuilder } from 'arkormx'

/** Layouts that needed the old `premium_layouts` plan feature. */
const PREMIUM_LAYOUTS = ['collage', 'triptych', 'mosaic', 'strip', 'contact', 'scatter', 'story', 'feature', 'squares', 'aside', 'opener']

export default class CreateDesignRestrictionsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('design_restrictions', (table) => {
      table.id('id', 'uuid').primary()
      table.string('kind')
      table.string('design')
      table.json('planIds').map('plan_ids')
      table.timestamps()
      table.unique(['kind', 'design'])
      table.index(['kind'])
    })
  }

  /** Premium layouts move from the `premium_layouts` feature to restrictions naming the plans that had it. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    const plans = `coalesce((select json_agg(id) from plans
      where (features::jsonb -> 'premium_layouts' ->> 'value')::boolean
        and coalesce(features::jsonb -> 'premium_layouts' ->> 'active', 'true') = 'true'), '[]'::json)`

    for (const design of PREMIUM_LAYOUTS) {
      await DB.raw(
        `insert into design_restrictions (kind, design, plan_ids)
          values ('layout', '${design}', ${plans})
          on conflict (kind, design) do nothing`,
      )
    }

    await DB.raw(`update plans set features = (features::jsonb - 'premium_layouts')::json`)
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('design_restrictions')
  }
}
