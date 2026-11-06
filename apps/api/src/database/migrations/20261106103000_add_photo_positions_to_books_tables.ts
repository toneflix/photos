import { Migration, SchemaBuilder } from 'arkormx'

export default class AddPhotoPositionsToBooksTablesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.json('coverPosition').nullable().map('cover_position')
    })

    schema.alterTable('book_pages', (table) => {
      table.json('photoPositions').nullable().map('photo_positions')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('coverPosition')
    })

    schema.alterTable('book_pages', (table) => {
      table.dropColumn('photoPositions')
    })
  }
}
