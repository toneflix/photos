import { DOCUMENTS } from './content/documents'
import { Document } from '@app/models/Document'
import { Seeder } from '@arkstack/database'

/**
 * The about page, privacy policy and terms of use. Documents that already exist are
 * left as admins wrote them, so this is safe to run again.
 */
export class DocumentSeeder extends Seeder {
  public async run(): Promise<void> {
    for (const seed of DOCUMENTS) {
      if (await Document.query().where({ slug: seed.slug }).exists()) continue

      await Document.open({ ...seed, published: true })
    }
  }
}
