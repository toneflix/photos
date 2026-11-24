import * as Print from 'expo-print'
import { apiUrl } from './links'
import { session } from './session'

/** A 210 × 280 mm sheet in points, the size the book's pages are laid out at. */
const SHEET = { width: 595, height: 794 }

/**
 * Opens the system print sheet for a book laid out page by page. The API draws the page with no script,
 * so the print webview shows it as it is once its photos have loaded.
 */
export async function printBook(id: string): Promise<void> {
  const token = session.getToken()
  const response = await fetch(apiUrl(`/books/${encodeURIComponent(id)}/print`), {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  }).catch(() => null)

  if (!response) throw new Error("We couldn't reach Toneflix Photos. Check your connection and try again.")
  if (!response.ok) {
    const body = await response.json().catch(() => null)

    throw new Error(typeof body?.message === 'string' ? body.message : "We couldn't get your book ready to print.")
  }

  const html = await response.text()

  try {
    await Print.printAsync({ html, ...SHEET })
  } catch (error) {
    // Closing the print sheet without printing isn't a failure.
    const { code, message } = (error ?? {}) as { code?: string; message?: string }

    if (code === 'ERR_PRINT_INCOMPLETE' || message?.includes('did not complete')) return
    throw new Error("We couldn't open the print sheet. Please try again.")
  }
}
