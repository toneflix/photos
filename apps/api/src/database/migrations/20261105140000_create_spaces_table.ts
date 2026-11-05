import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateSpacesTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('spaces', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('userId').map('user_id').foreign().references('users', 'id').onDelete('cascade').as('user').inverseAlias('spaces')
      table.string('name')
      table.string('slug').unique()
      table.text('description').nullable()
      table.string('visibility').default('private')
      table.timestamp('publishedAt').nullable().map('published_at')
      table.timestamps()
      table.index(['userId'])
      table.index(['visibility', 'publishedAt'])
    })

    schema.alterTable('photos', (table) => {
      table.uuid('spaceId').nullable().map('space_id').foreign().references('spaces', 'id').onDelete('setNull').as('space').inverseAlias('photos')
      table.index(['spaceId'])
    })

    schema.alterTable('books', (table) => {
      table.uuid('spaceId').nullable().map('space_id').foreign().references('spaces', 'id').onDelete('setNull').as('space').inverseAlias('books')
      table.index(['spaceId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.dropColumn('spaceId')
    })

    schema.alterTable('books', (table) => {
      table.dropColumn('spaceId')
    })

    schema.dropTable('spaces')
  }
}
