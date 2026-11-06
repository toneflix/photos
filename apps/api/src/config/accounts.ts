/**
 * Sign-ups, sign-in and what new accounts start with. Admins can change these in the dashboard.
 */
export default () => {
  return {
    /**
     * Whether anyone can create an account.
     */
    registration_open: Boolean(env('REGISTRATION_OPEN', true)),

    /**
     * Licence new accounts give their uploads until they choose another.
     */
    default_license: String(env('DEFAULT_LICENSE', 'all-rights-reserved')),

    /**
     * Who can open new books on a new account until they choose otherwise.
     */
    default_visibility: String(env('DEFAULT_BOOK_VISIBILITY', 'private')),

    /**
     * Wrong passwords allowed for one email from one IP before sign-in pauses.
     */
    max_password_attempts: Number(env('SIGN_IN_MAX_ATTEMPTS', 5)),

    /**
     * How long sign-in pauses after too many wrong passwords or codes, in minutes.
     */
    lockout_minutes: Number(env('SIGN_IN_LOCKOUT_MINUTES', 15)),
  }
}
