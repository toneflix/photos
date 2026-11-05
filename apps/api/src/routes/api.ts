import AuthController from 'src/app/http/controllers/AuthController'
import BookController from 'src/app/http/controllers/BookController'
import PhotoController from 'src/app/http/controllers/PhotoController'
import { Router } from '@arkstack/driver-express'
import { auth, limiter } from '@arkstack/driver-express/middlewares'

Router.get('/', () => {
  return { status: 'OK' }
})

// Auth
Router.post('/auth/register', [AuthController, 'register'], [limiter(20, 60)])
Router.post('/auth/login', [AuthController, 'login'], [limiter(20, 60)])
Router.get('/auth/me', [AuthController, 'me'], [auth])
Router.post('/auth/logout', [AuthController, 'logout'], [auth])

// Photo library
Router.apiResource('/photos', PhotoController, { middlewares: auth })

// Books. Opening a book works without signing in when it is shared or public.
Router.apiResource('/books', BookController, {
  middlewares: { index: auth, create: auth, update: auth, destroy: auth },
})
Router.put('/books/:book/pages', [BookController, 'savePages'], [auth])
