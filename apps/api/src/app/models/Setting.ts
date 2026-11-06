import { Model } from '@arkstack/database'

/** One app setting an admin saved, overriding the config value at the same key. */
export class Setting extends Model {
  declare id: string
  declare key: string
  declare value: unknown
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'settings'

  protected override casts = {
    value: 'json',
  } as never
}
