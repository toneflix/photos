import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePaymentsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('payments', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('payments')
      table
        .uuid('planId')
        .nullable()
        .map('plan_id')
        .foreign()
        .references('plans', 'id')
        .onDelete('setNull')
        .as('plan')
        .inverseAlias('payments')
      table.string('planSlug').map('plan_slug')
      table.string('title')
      table.integer('cycles').default(1)
      table.string('reference').unique()
      table.string('provider')
      table.string('status').default('pending')
      table.decimal('amount', 12, 2)
      table.string('currency')
      table.decimal('chargeAmount', 14, 2).map('charge_amount')
      table.string('chargeCurrency').map('charge_currency')
      table.decimal('exchangeRate', 20, 8).default(1).map('exchange_rate')
      table.json('response').nullable()
      table.timestamp('paidAt').nullable().map('paid_at')
      table.timestamps()
      table.index(['userId', 'createdAt'])
      table.index(['status'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('payments')
  }
}
