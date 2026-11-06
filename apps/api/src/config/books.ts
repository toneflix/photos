/**
 * Limits for photo books. Admins can change these in the dashboard.
 */
export default () => {
  return {
    /**
     * The most pages one book can have.
     */
    max_pages: Number(env('BOOKS_MAX_PAGES', 500)),

    /**
     * Wrong access codes one visitor may try within 15 minutes before codes stop working for them.
     */
    max_code_guesses: Number(env('ACCESS_CODE_MAX_GUESSES', 20)),
  }
}
