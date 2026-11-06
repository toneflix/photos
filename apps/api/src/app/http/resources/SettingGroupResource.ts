import { type SettingGroup, Settings } from '@app/support/Settings'
import { Resource } from 'resora'

/** A settings group with each field's value in use, its .env default, and whether an admin saved it. */
export class SettingGroupResource extends Resource {
  async data() {
    const group = this.resource as SettingGroup
    const saved = await Settings.saved()

    return {
      id: group.id,
      title: group.title,
      description: group.description,
      icon: group.icon,
      fields: group.fields.map((field) => ({
        name: field.name,
        env: field.env ?? null,
        type: field.type,
        label: field.label,
        help: field.help ?? null,
        unit: field.unit ?? null,
        min: field.min ?? null,
        max: field.max ?? null,
        options: field.options ?? null,
        value: field.key in saved ? saved[field.key] : config(field.key as never),
        default: config(field.key as never),
        saved: field.key in saved,
      })),
    }
  }
}
