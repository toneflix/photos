import { Migration, SchemaBuilder } from 'arkormx'

export default class AddBrandingToBooksTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.string('kicker').nullable()
      table.string('brand').nullable()
      table.string('imprint').nullable()
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('books', (table) => {
      table.dropColumn('kicker')
      table.dropColumn('brand')
      table.dropColumn('imprint')
    })
  }
}
