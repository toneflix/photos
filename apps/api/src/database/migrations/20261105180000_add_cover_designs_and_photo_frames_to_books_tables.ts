import { Migration, SchemaBuilder } from 'arkormx'

export default class AddCoverDesignsAndPhotoFramesToBooksTablesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.string('coverDesign').default('classic').map('cover_design')
      table.boolean('coverText').nullable().map('cover_text')
    })

    schema.alterTable('book_pages', (table) => {
      table.json('photoFrames').nullable().map('photo_frames')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('coverDesign')
      table.dropColumn('coverText')
    })

    schema.alterTable('book_pages', (table) => {
      table.dropColumn('photoFrames')
    })
  }
}
