import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class AddPublishingToPhotosAndBooksTablesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.string('visibility').default('private')
      table.timestamp('publishedAt').nullable().map('published_at')
      table.index(['visibility', 'publishedAt'])
    })

    schema.alterTable('books', (table) => {
      table.timestamp('publishedAt').nullable().map('published_at')
      table.index(['visibility', 'publishedAt'])
    })
  }

  /** Books that were already public join the timeline at their last edit. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(`update books set published_at = "updatedAt" where visibility = 'public' and published_at is null`)
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.dropColumn('visibility')
      table.dropColumn('publishedAt')
    })

    schema.alterTable('books', (table) => {
      table.dropColumn('publishedAt')
    })
  }
}
