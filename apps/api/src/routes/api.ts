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
Router.get('/photos', [PhotoController, 'index'], [auth])
Router.post('/photos', [PhotoController, 'store'], [auth])
Router.get('/photos/:id', [PhotoController, 'show'], [auth])
Router.patch('/photos/:id', [PhotoController, 'update'], [auth])
Router.delete('/photos/:id', [PhotoController, 'destroy'], [auth])

// Books. Opening a book works without signing in when it is shared or public.
Router.get('/books', [BookController, 'index'], [auth])
Router.post('/books', [BookController, 'store'], [auth])
Router.get('/books/:id', [BookController, 'show'])
Router.patch('/books/:id', [BookController, 'update'], [auth])
Router.delete('/books/:id', [BookController, 'destroy'], [auth])
Router.put('/books/:id/pages', [BookController, 'savePages'], [auth])
