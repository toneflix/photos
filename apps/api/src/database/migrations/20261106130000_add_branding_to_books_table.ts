import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class AddBrandingToBooksTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table
        .uuid('creatorId')
        .nullable()
        .map('creator_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('creator')
        .inverseAlias('createdBooks')
      table.string('kicker').nullable()
      table.string('brand').nullable()
      table.string('imprint').nullable()
      table.index(['creatorId'])
    })
  }

  /** Books made before this were made by their current owner. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('update books set creator_id = user_id where creator_id is null')
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('creatorId')
      table.dropColumn('kicker')
      table.dropColumn('brand')
      table.dropColumn('imprint')
    })
  }
}
