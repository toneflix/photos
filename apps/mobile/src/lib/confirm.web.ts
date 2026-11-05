/** Asks before something that can't be undone, with the browser's dialog in the web preview. */
export async function confirm(title: string, message: string, _action: string) {
  return window.confirm(`${title}\n\n${message}`)
}
