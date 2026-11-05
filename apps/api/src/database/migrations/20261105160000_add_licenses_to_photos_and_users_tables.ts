import { Migration, SchemaBuilder } from 'arkormx'

export default class AddLicensesToPhotosAndUsersTablesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.string('license').default('all-rights-reserved')
    })

    schema.alterTable('users', (table) => {
      table.string('defaultLicense').default('all-rights-reserved').map('default_license')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.dropColumn('license')
    })

    schema.alterTable('users', (table) => {
      table.dropColumn('defaultLicense')
    })
  }
}
