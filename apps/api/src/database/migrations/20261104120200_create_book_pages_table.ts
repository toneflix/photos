import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateBookPagesTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('book_pages', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookId')
        .map('book_id')
        .foreign()
        .references('books', 'id')
        .onDelete('cascade')
        .as('book')
        .inverseAlias('pages')
      table.integer('position')
      table.string('layout').default('single')
      table.text('caption').nullable()
      // Ordered photo ids shown on this page.
      table.json('photoIds').map('photo_ids')
      table.timestamps()
      table.index(['bookId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('book_pages')
  }
}
