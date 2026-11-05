import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateBooksTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('books', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('books')
      table.string('title')
      table.text('description').nullable()
      table.uuid('coverPhotoId').nullable().map('cover_photo_id')
      table.string('visibility').default('private')
      table.string('theme').default('classic')
      table.timestamps()
      table.index(['userId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('books')
  }
}
