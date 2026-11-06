import { Seeder } from '@arkstack/database'
import { PlanSeeder } from './PlanSeeder'
import { UserSeeder } from './UserSeeder'

export class DatabaseSeeder extends Seeder {
  public async run(): Promise<void> {
    this.call([PlanSeeder, UserSeeder])
  }
}
