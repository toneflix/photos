import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateSubscriptionsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('subscriptions', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('subscriptions')
      table
        .uuid('planId')
        .nullable()
        .map('plan_id')
        .foreign()
        .references('plans', 'id')
        .onDelete('setNull')
        .as('plan')
        .inverseAlias('subscriptions')
      table.string('planSlug').map('plan_slug')
      table.decimal('amount', 12, 2).default(0)
      table.string('currency').default('NGN')
      table.string('reference').nullable()
      table.timestamp('startsAt').map('starts_at')
      table.timestamp('endsAt').map('ends_at')
      table.timestamps()
      table.index(['userId', 'endsAt'])
      table.index(['planId'])
      table.index(['reference'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('subscriptions')
  }
}
