import { Migration, SchemaBuilder } from 'arkormx'

export default class AddPaperToBooksTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.string('paper').default('ivory')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('paper')
    })
  }
}
