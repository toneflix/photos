import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePaymentRegionsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('payment_regions', (table) => {
      table.id('id', 'uuid').primary()
      table.string('name')
      table.json('countries')
      table.string('currency')
      table.decimal('exchangeRate', 20, 8).nullable().map('exchange_rate')
      table.decimal('rateMarkup', 6, 2).default(0).map('rate_markup')
      table.boolean('active').default(true)
      table.timestamps()
      table.index(['active'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('payment_regions')
  }
}
