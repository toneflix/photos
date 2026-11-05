import type {
  ApiResponse,
  AuthToken,
  Book,
  BookPageInput,
  BookTheme,
  BookWithPages,
  PaperColor,
  ID,
  PageQuery,
  PaginatedResponse,
  Photo,
  User,
} from '@photos/types'
import type { PhotosAlova } from './client'

/**
 * Typed request methods for every API endpoint. Each call returns an alova
 * Method: `await` it (or call `.send()`) on the server, or pass it to
 * `useRequest` / `usePagination` in the apps.
 *
 * Routes match apps/api/src/routes/api.ts.
 */
export function createEndpoints(alova: PhotosAlova) {
  return {
    auth: {
      login: (data: { email: string; password: string }) =>
        alova.Post<ApiResponse<{ user: User } & AuthToken>>('/auth/login', data),
      register: (data: { name: string; email: string; password: string }) =>
        alova.Post<ApiResponse<{ user: User } & AuthToken>>('/auth/register', data),
      logout: () => alova.Post<ApiResponse<null>>('/auth/logout'),
      me: () => alova.Get<ApiResponse<User>>('/auth/me', { cacheFor: null }),
    },

    photos: {
      list: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Photo>>('/photos', { params }),
      get: (id: ID) => alova.Get<ApiResponse<Photo>>(`/photos/${id}`),
      /**
       * Upload one photo. `file` is a File/Blob on web, or an RN `{ uri, name, type }` object.
       * Send the pixel size when known so books can lay the photo out before it loads.
       */
      upload: (
        file: Blob | { uri: string; name: string; type: string },
        meta: { caption?: string; width?: number; height?: number; takenAt?: string } = {},
      ) => {
        const form = new FormData()
        const name = (file as { name?: string }).name
        if (name) form.append('photo', file as Blob, name)
        else form.append('photo', file as Blob)
        for (const [key, value] of Object.entries(meta)) {
          if (value !== undefined && value !== null && value !== '') form.append(key, String(value))
        }
        return alova.Post<ApiResponse<Photo>>('/photos', form)
      },
      update: (id: ID, data: Partial<Pick<Photo, 'caption' | 'takenAt'>>) =>
        alova.Put<ApiResponse<Photo>>(`/photos/${id}`, data),
      remove: (id: ID) => alova.Delete<ApiResponse<null>>(`/photos/${id}`),
    },

    books: {
      list: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Book>>('/books', { params }),
      /** A book with every page. Works signed out for shared and public books. */
      get: (id: ID) => alova.Get<ApiResponse<BookWithPages>>(`/books/${id}`),
      create: (data: Pick<Book, 'title'> & Partial<Pick<Book, 'description' | 'visibility' | 'theme' | 'paper'>>) =>
        alova.Post<ApiResponse<Book>>('/books', data),
      update: (
        id: ID,
        data: Partial<Pick<Book, 'title' | 'description' | 'visibility' | 'coverPhotoId'> & { theme: BookTheme; paper: PaperColor }>,
      ) => alova.Put<ApiResponse<BookWithPages>>(`/books/${id}`, data),
      /** Replace every page of the book, in order. */
      savePages: (id: ID, pages: BookPageInput[]) =>
        alova.Put<ApiResponse<BookWithPages>>(`/books/${id}/pages`, { pages }),
      remove: (id: ID) => alova.Delete<ApiResponse<null>>(`/books/${id}`),
    },
  }
}

export type PhotosEndpoints = ReturnType<typeof createEndpoints>
