import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateDocumentsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('documents', (table) => {
      table.id('id', 'uuid').primary()
      table.string('slug').unique()
      table.string('type').default('page')
      table.string('title')
      table.string('summary').nullable()
      table.text('body')
      table.integer('sort').default(0)
      table.timestamp('publishedAt').nullable().map('published_at')
      table.timestamps()
      table.index(['type'])
      table.index(['publishedAt'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('documents')
  }
}
