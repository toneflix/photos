import type {
  ApiResponse,
  AuthToken,
  Book,
  BookPage,
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
 * Routes here are placeholders for the core API step and will be adjusted as
 * the API is built.
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
      /** Upload one photo. `file` is a File/Blob on web, or an RN `{ uri, name, type }` object. */
      upload: (file: Blob | { uri: string; name: string; type: string }, caption?: string) => {
        const form = new FormData()
        form.append('photo', file as Blob)
        if (caption) form.append('caption', caption)
        return alova.Post<ApiResponse<Photo>>('/photos', form)
      },
      update: (id: ID, data: Partial<Pick<Photo, 'caption' | 'takenAt'>>) =>
        alova.Patch<ApiResponse<Photo>>(`/photos/${id}`, data),
      remove: (id: ID) => alova.Delete<ApiResponse<null>>(`/photos/${id}`),
    },

    books: {
      list: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Book>>('/books', { params }),
      get: (id: ID) => alova.Get<ApiResponse<Book>>(`/books/${id}`),
      pages: (id: ID) => alova.Get<ApiResponse<BookPage[]>>(`/books/${id}/pages`),
      create: (data: Pick<Book, 'title'> & Partial<Pick<Book, 'description' | 'visibility'>>) =>
        alova.Post<ApiResponse<Book>>('/books', data),
      update: (id: ID, data: Partial<Pick<Book, 'title' | 'description' | 'visibility' | 'coverPhotoId'>>) =>
        alova.Patch<ApiResponse<Book>>(`/books/${id}`, data),
      remove: (id: ID) => alova.Delete<ApiResponse<null>>(`/books/${id}`),
    },
  }
}

export type PhotosEndpoints = ReturnType<typeof createEndpoints>
