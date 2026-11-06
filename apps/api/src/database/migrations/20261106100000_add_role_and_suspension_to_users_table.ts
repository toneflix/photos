import { Migration, SchemaBuilder } from 'arkormx'

export default class AddRoleAndSuspensionToUsersTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('users', (table) => {
      table.string('role').default('user')
      table.timestamp('suspendedAt').nullable().map('suspended_at')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('users', (table) => {
      table.dropColumn('role')
      table.dropColumn('suspendedAt')
    })
  }
}
