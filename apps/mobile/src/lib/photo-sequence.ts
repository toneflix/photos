import { useState } from 'react'
import { router } from 'expo-router'
import type { Photo } from '@photos/types'

export type SequencePhoto = Pick<Photo, 'id' | 'url' | 'width' | 'height' | 'caption'>

/** -1 for the photo before, 1 for the one after. */
export type SwipeStep = -1 | 1

/** The photos of the list a photo was last opened from, in the order the list shows them. */
export class PhotoSequence {
  private photos: SequencePhoto[] = []

  /** Remembers the list before one of its photos opens. */
  follow(photos: SequencePhoto[]) {
    this.photos = photos
  }

  get list() {
    return this.photos
  }
}

export const explorePhotos = new PhotoSequence()
export const libraryPhotos = new PhotoSequence()

/** A photo screen's place in the list it was opened from, and the swipe to the photo before or after it. */
export type PhotoNeighbours = {
  previous?: SequencePhoto
  next?: SequencePhoto
  /** The side the shown photo came in from, or 0 when it was opened from the list. */
  entered: number
  move: (step: SwipeStep) => void
}

/**
 * Keeps the list the screen was opened from for as long as the screen lives. Moving
 * swaps the photo in place, so going back still returns to the list.
 */
export function usePhotoNeighbours(sequence: PhotoSequence, id: string) {
  const [photos] = useState(() => sequence.list)
  const [entered, setEntered] = useState(0)
  const index = photos.findIndex((photo) => photo.id === id)
  const current = index >= 0 ? photos[index] : undefined

  const move = (step: SwipeStep) => {
    const target = photos[index + step]

    if (!current || !target) return

    setEntered(step)
    router.setParams({ id: target.id })
  }

  const neighbours: PhotoNeighbours = {
    previous: current ? photos[index - 1] : undefined,
    next: current ? photos[index + 1] : undefined,
    entered,
    move,
  }

  return { preview: current, neighbours }
}
