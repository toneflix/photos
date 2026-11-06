import { useSyncExternalStore } from 'react'
import * as Clipboard from 'expo-clipboard'

export type ToastTone = 'success' | 'error'
export type ToastMessage = { id: number; text: string; tone: ToastTone }

/** The short confirmation shown at the bottom of the screen. One at a time; a new one replaces the last. */
export class Toasts {
  private static readonly DURATION = 3000

  private current: ToastMessage | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private nextId = 1
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getState = () => this.current

  show(text: string, tone: ToastTone = 'success') {
    if (this.timer) clearTimeout(this.timer)

    this.current = { id: this.nextId++, text, tone }
    this.timer = setTimeout(() => this.hide(), Toasts.DURATION)
    this.publish()
  }

  hide() {
    if (this.timer) clearTimeout(this.timer)

    this.timer = null
    this.current = null
    this.publish()
  }

  /** Copies text and says whether it worked. */
  async copy(text: string, confirmation = 'Copied.') {
    try {
      await Clipboard.setStringAsync(text)

      this.show(confirmation)
    } catch {
      this.show("Couldn't copy. Select the text and copy it yourself.", 'error')
    }
  }

  private publish() {
    this.listeners.forEach((listener) => listener())
  }
}

export const toast = new Toasts()

export function useToast() {
  return useSyncExternalStore(toast.subscribe, toast.getState, toast.getState)
}
