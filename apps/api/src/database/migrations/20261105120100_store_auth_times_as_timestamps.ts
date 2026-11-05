import { Migration, SchemaBuilder } from 'arkormx'

export default class StoreAuthTimesAsTimestampsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('personal_access_tokens', (table) => {
      table.timestamp('lastUsedAt').nullable().map('last_used_at').change()
      table.timestamp('expiresAt').nullable().map('expires_at').change()
    })

    schema.alterTable('user_two_factors', (table) => {
      table.timestamp('smsCodeExpiresAt').nullable().map('sms_code_expires_at').change()
      table.timestamp('enabledAt').nullable().map('enabled_at').change()
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('personal_access_tokens', (table) => {
      table.date('lastUsedAt').nullable().map('last_used_at').change()
      table.date('expiresAt').nullable().map('expires_at').change()
    })

    schema.alterTable('user_two_factors', (table) => {
      table.date('smsCodeExpiresAt').nullable().map('sms_code_expires_at').change()
      table.date('enabledAt').nullable().map('enabled_at').change()
    })
  }
}
