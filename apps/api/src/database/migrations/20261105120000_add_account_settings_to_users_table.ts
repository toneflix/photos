import { Migration, SchemaBuilder } from 'arkormx'

export default class AddAccountSettingsToUsersTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('users', (table) => {
      table.timestamp('emailVerifiedAt').nullable().map('email_verified_at')
      table.string('avatarPath').nullable().map('avatar_path')
      table.string('avatarDisk').nullable().map('avatar_disk')
      table.string('defaultVisibility').default('private').map('default_visibility')
      table.boolean('showOwnerName').default(true).map('show_owner_name')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('users', (table) => {
      table.dropColumn('emailVerifiedAt')
      table.dropColumn('avatarPath')
      table.dropColumn('avatarDisk')
      table.dropColumn('defaultVisibility')
      table.dropColumn('showOwnerName')
    })
  }
}
