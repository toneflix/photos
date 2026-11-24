import { Migration, SchemaBuilder } from 'arkormx'

export default class AddPageShapeToBooksTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.string('pageShape').default('portrait').map('page_shape')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('pageShape')
    })
  }
}
