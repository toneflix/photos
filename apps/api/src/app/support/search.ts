import { where } from 'arkormx'

/** A case-insensitive "contains" match for text someone typed, with LIKE wildcards escaped. */
export const matches = (column: string, text: string) => where(column, 'ilike', `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`)

/** Ways to order a list: newest or oldest first. */
export const SORTS = ['latest', 'oldest']
