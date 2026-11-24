import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class GrantPagePrintToPremiumMigration extends Migration {
  public async up(_schema: SchemaBuilder): Promise<void> {}

  /** The seeded Premium plan includes printing; plans admins made keep what they set. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(
      `update plans set features = jsonb_set(features::jsonb, '{page_print}', '{"value": true, "active": true, "listed": true}'::jsonb)::json
        where slug = 'premium' and features::jsonb -> 'page_print' is null`,
    )
  }

  public async down(_schema: SchemaBuilder): Promise<void> {}
}
