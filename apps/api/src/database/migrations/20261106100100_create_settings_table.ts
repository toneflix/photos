import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateSettingsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('settings', (table) => {
      table.id('id', 'uuid').primary()
      table.string('key').unique()
      table.json('value')
      table.timestamps()
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('settings')
  }
}
