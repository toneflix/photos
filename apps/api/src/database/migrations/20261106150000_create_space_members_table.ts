import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateSpaceMembersTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('space_members', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('spaceId')
        .map('space_id')
        .foreign()
        .references('spaces', 'id')
        .onDelete('cascade')
        .as('space')
        .inverseAlias('members')
      table
        .uuid('userId')
        .nullable()
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('spaceMemberships')
      table
        .uuid('invitedById')
        .nullable()
        .map('invited_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('invitedBy')
        .inverseAlias('spaceInvitesSent')
      table.string('email')
      table.json('permissions')
      table.timestamp('acceptedAt').nullable().map('accepted_at')
      table.timestamps()
      table.unique(['spaceId', 'email'])
      table.index(['userId', 'acceptedAt'])
      table.index(['email', 'acceptedAt'])
      table.index(['invitedById'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('space_members')
  }
}
