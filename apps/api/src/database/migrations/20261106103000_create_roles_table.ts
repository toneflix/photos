import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class CreateRolesTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('roles', (table) => {
      table.id('id', 'uuid').primary()
      table.string('slug').unique()
      table.string('name')
      table.string('description').nullable()
      table.json('permissions')
      table.boolean('isSystem').default(false).map('is_system')
      table.timestamps()
    })
  }

  /** Members and admins are built in; moderators are a starting point admins can change. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(
      `insert into roles (id, slug, name, description, permissions, is_system, "createdAt", "updatedAt") values
        (gen_random_uuid(), 'user', 'Member', 'Everyone who signs up. No admin access.', '[]', true, now(), now()),
        (gen_random_uuid(), 'admin', 'Admin', 'Can do everything, always.', '[]', true, now(), now()),
        (gen_random_uuid(), 'moderator', 'Moderator', 'Reviews what people show on Explore.', '["dashboard.view","content.moderate"]', false, now(), now())
      on conflict (slug) do nothing`,
    )
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('roles')
  }
}
