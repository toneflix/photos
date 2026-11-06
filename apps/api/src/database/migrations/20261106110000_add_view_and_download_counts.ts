import { Migration, SchemaBuilder } from 'arkormx'

export default class AddViewAndDownloadCountsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('photos', (table) => {
      table.integer('viewCount').default(0).map('view_count')
      table.integer('downloadCount').default(0).map('download_count')
    })

    schema.alterTable('books', (table) => {
      table.integer('viewCount').default(0).map('view_count')
      table.integer('downloadCount').default(0).map('download_count')
    })

    schema.alterTable('spaces', (table) => {
      table.integer('viewCount').default(0).map('view_count')
    })

    schema.alterTable('users', (table) => {
      table.boolean('showCounts').default(false).map('show_counts')
    })

    schema.createTable('content_stats', (table) => {
      table.id('id', 'uuid').primary()
      table.string('subjectType').map('subject_type')
      table.uuid('subjectId').map('subject_id')
      table.uuid('ownerId').map('owner_id')
      table.date('day')
      table.integer('views').default(0)
      table.integer('downloads').default(0)
      table.unique(['subjectType', 'subjectId', 'day'])
      table.index(['day'])
      table.index(['ownerId', 'day'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('content_stats')

    schema.alterTable('photos', (table) => {
      table.dropColumn('viewCount')
      table.dropColumn('downloadCount')
    })

    schema.alterTable('books', (table) => {
      table.dropColumn('viewCount')
      table.dropColumn('downloadCount')
    })

    schema.alterTable('spaces', (table) => {
      table.dropColumn('viewCount')
    })

    schema.alterTable('users', (table) => {
      table.dropColumn('showCounts')
    })
  }
}
