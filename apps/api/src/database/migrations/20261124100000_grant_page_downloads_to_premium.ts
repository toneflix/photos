import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class GrantPageDownloadsToPremiumMigration extends Migration {
  public async up(_schema: SchemaBuilder): Promise<void> {}

  /** The seeded Premium plan includes page downloads; plans admins made keep what they set. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    for (const key of ['page_pdf', 'page_images'])
      await DB.raw(
        `update plans set features = jsonb_set(features::jsonb, '{${key}}', '{"value": true, "active": true, "listed": true}'::jsonb)::json
          where slug = 'premium' and features::jsonb -> '${key}' is null`,
      )
  }

  public async down(_schema: SchemaBuilder): Promise<void> {}
}
