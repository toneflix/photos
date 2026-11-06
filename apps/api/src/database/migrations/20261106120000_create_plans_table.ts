import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePlansTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('plans', (table) => {
      table.id('id', 'uuid').primary()
      table.string('slug').unique()
      table.string('name')
      table.string('description').nullable()
      table.decimal('price', 12, 2).default(0)
      table.string('currency').default('NGN')
      table.string('interval').default('month')
      table.integer('intervalCount').default(1).map('interval_count')
      table.json('billingOptions').nullable().map('billing_options')
      table.json('features')
      table.boolean('isDefault').default(false).map('is_default')
      table.boolean('active').default(true)
      table.boolean('isHidden').default(false).map('is_hidden')
      table.integer('sort').default(0)
      table.timestamps()
      table.index(['isDefault'])
      table.index(['active', 'isHidden'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('plans')
  }
}
