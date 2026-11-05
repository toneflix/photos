import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePhotosTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('photos', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('photos')
      table.string('disk')
      table.string('path')
      table.string('originalName').nullable().map('original_name')
      table.string('mimeType').map('mime_type')
      table.bigInteger('size')
      table.integer('width').nullable()
      table.integer('height').nullable()
      table.text('caption').nullable()
      table.timestamp('takenAt').nullable().map('taken_at')
      table.timestamps()
      table.index(['userId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('photos')
  }
}
