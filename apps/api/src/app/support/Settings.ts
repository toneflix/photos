import { Cache } from '@arkstack/cache'
import { Setting } from '@app/models/Setting'
import { abortIf } from '@arkstack/common'

export type SettingType = 'number' | 'boolean' | 'select' | 'text'

export interface SettingOption {
  value: string
  label: string
}

/** One value admins can change, as listed in config/settings.ts. */
export interface SettingField {
  /** The form field name, unique within its group. */
  name: string
  /** The config key it overrides. */
  key: string
  /** The env variable the config value comes from. */
  env?: string
  type: SettingType
  label: string
  help?: string
  unit?: string
  min?: number
  /** The largest number, or the most characters for text. */
  max?: number
  options?: SettingOption[]
}

export interface SettingGroup {
  id: string
  title: string
  description: string
  icon: string
  fields: SettingField[]
}

/**
 * App settings that admins change at run time. A saved value overrides the config
 * value at the same key; anything not saved falls back to config, and so to .env.
 * Saved values are cached for `settings.cache_seconds` in the cache store.
 */
export class Settings {
  static readonly CACHE_KEY = 'settings:saved'

  static groups(): SettingGroup[] {
    return config('settings.groups', []) as SettingGroup[]
  }

  /** The group with `id`, or a 404. */
  static group(id: string): SettingGroup {
    const group = Settings.groups().find((group) => group.id === id)

    abortIf(!group, 'Settings group not found!', 404)

    return group!
  }

  /** Every saved value, by config key, in its field's type. */
  static async saved(): Promise<Record<string, unknown>> {
    return Cache.remember(Settings.CACHE_KEY, Number(config('settings.cache_seconds', 60)), async () => {
      const rows = (await Setting.query().get()).all()
      const fields = new Map(Settings.groups().flatMap((group) => group.fields.map((field) => [field.key, field] as const)))

      return Object.fromEntries(rows.map((row) => [row.key, fields.has(row.key) ? Settings.cast(fields.get(row.key)!, row.value) : row.value]))
    })
  }

  /** The value in use for a config key: the saved one, else the config value. */
  static async get<T = unknown>(key: string): Promise<T> {
    const saved = await Settings.saved()

    return (key in saved ? saved[key] : config(key as never)) as T
  }

  static async number(key: string): Promise<number> {
    return Number(await Settings.get(key))
  }

  /** Validation rules for a group's form. Every field is optional; null puts it back to its default. */
  static rules(group: SettingGroup): Record<string, string> {
    return Object.fromEntries(
      group.fields.map((field) => {
        if (field.type === 'boolean') return [field.name, 'nullable|boolean']
        if (field.type === 'select') return [field.name, `nullable|in:${field.options!.map((option) => option.value).join(',')}`]
        if (field.type === 'text') return [field.name, `nullable|string|max:${field.max ?? 255}`]

        return [field.name, `nullable|integer|min:${field.min ?? 0}|max:${field.max ?? Number.MAX_SAFE_INTEGER}`]
      }),
    )
  }

  /**
   * Save the fields of `group` present in `values`, as JSON. A value that is null or matches
   * the config value is removed, so the field follows .env again.
   */
  static async update(group: SettingGroup, values: Record<string, unknown>): Promise<void> {
    for (const field of group.fields) {
      if (!(field.name in values)) continue

      const value = Settings.cast(field, values[field.name])

      if (value === null || value === config(field.key as never)) {
        await Setting.query().where({ key: field.key }).delete()
        continue
      }

      await Setting.query().updateOrCreate({ key: field.key }, { value: JSON.stringify(value) })
    }

    await Cache.forget(Settings.CACHE_KEY)
  }

  /** A submitted value in the field's own type. */
  static cast(field: SettingField, value: unknown): unknown {
    if (typeof value === 'string') value = value.trim()
    if (value === null || value === undefined || value === '') return null
    if (field.type === 'boolean') return value === true || value === 'true' || value === 1 || value === '1' || value === 'on'
    if (field.type === 'number') return Number(value)

    return String(value)
  }
}
