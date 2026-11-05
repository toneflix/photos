import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateBookAccessCodesTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('book_access_codes', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookId')
        .map('book_id')
        .foreign()
        .references('books', 'id')
        .onDelete('cascade')
        .as('book')
        .inverseAlias('accessCodes')
      table.string('code').unique()
      table.string('label').nullable()
      table.json('permissions')
      table.integer('uses').default(0)
      table.timestamp('lastUsedAt').nullable().map('last_used_at')
      table.timestamp('expiresAt').nullable().map('expires_at')
      table.timestamps()
      table.index(['bookId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('book_access_codes')
  }
}
