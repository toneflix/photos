/**
 * Limits and default branding for photo books. Admins can change these in the dashboard.
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

    /**
     * What books print when their maker's plan doesn't give them their own branding.
     */
    branding: {
      kicker: String(env('BOOK_KICKER', 'A Toneflix photo book')),
      imprint: String(env('BOOK_IMPRINT', 'Toneflix Photos')),
      colophon: String(env('BOOK_COLOPHON', 'Preserved for all time with Toneflix Photos.')),
    },
  }
}
