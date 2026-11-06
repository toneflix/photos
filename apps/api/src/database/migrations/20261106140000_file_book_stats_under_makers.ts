import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class FileBookStatsUnderMakersMigration extends Migration {
  public async up(_schema: SchemaBuilder): Promise<void> {}

  /** Book views and downloads count toward the book's maker, also from before a client claimed it. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(
      `update content_stats set owner_id = books.creator_id from books
        where content_stats.subject_type = 'book' and content_stats.subject_id = books.id and books.creator_id is not null`,
    )
  }

  public async down(_schema: SchemaBuilder): Promise<void> {}
}
