import { Migration, SchemaBuilder } from 'arkormx'

export default class AddFramesToBooksAndBookPagesTablesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.string('frame').default('none')
    })

    schema.alterTable('book_pages', (table) => {
      table.string('frame').nullable()
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('frame')
    })

    schema.alterTable('book_pages', (table) => {
      table.dropColumn('frame')
    })
  }
}
