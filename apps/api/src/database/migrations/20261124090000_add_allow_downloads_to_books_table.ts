import { Migration, SchemaBuilder } from 'arkormx'

export default class AddAllowDownloadsToBooksTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.boolean('allowDownloads').default(true).map('allow_downloads')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('allowDownloads')
    })
  }
}
