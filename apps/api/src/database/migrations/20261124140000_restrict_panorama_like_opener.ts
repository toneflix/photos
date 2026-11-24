import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class RestrictPanoramaLikeOpenerMigration extends Migration {
  public async up(_schema: SchemaBuilder): Promise<void> {}

  /** Panorama pages start on the plans that have the Opener layout; admins can change either afterwards. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(
      `insert into design_restrictions (kind, design, plan_ids)
        select kind, 'panorama', plan_ids from design_restrictions where kind = 'layout' and design = 'opener'
        on conflict (kind, design) do nothing`,
    )
  }

  public async down(_schema: SchemaBuilder): Promise<void> {}
}
