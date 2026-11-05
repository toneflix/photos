import { PhotosApiError } from '@photos/api-client'

/** What went wrong with a form submit: a message, plus the first error for each field. */
export class FormProblem {
  private constructor(
    readonly message: string | null,
    readonly fields: Record<string, string>,
  ) {}

  static from(error: unknown) {
    if (!error) return new FormProblem(null, {})

    if (error instanceof PhotosApiError) {
      const fields = Object.fromEntries(
        Object.entries(error.errors ?? {})
          .filter(([, messages]) => messages?.[0])
          .map(([field, messages]) => [field, messages[0]]),
      )

      return new FormProblem(error.message, fields)
    }

    return new FormProblem("We couldn't reach Toneflix Photos. Check your connection and try again.", {})
  }

  /** The message to show above the form, when no field explains the problem itself. */
  get summary() {
    return Object.keys(this.fields).length ? null : this.message
  }
}
