import { Migration, SchemaBuilder } from 'arkormx'

export default class AddDisplayPathToPhotosTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.string('displayPath').nullable().map('display_path')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.dropColumn('displayPath')
    })
  }
}
