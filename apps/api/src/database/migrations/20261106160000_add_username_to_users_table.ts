import { Migration, SchemaBuilder } from 'arkormx'
import { User } from 'src/app/models/User'

export default class AddUsernameToUsersTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('users', (table) => {
      table.string('username').nullable().unique()
    })
  }

  /** Existing accounts get a username made from their email address. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    for await (const user of User.query().whereNull('username').lazyById(200)) {
      await user.update({ username: await User.freeUsername(user.email) })
    }
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('users', (table) => {
      table.dropColumn('username')
    })
  }
}
