import AccountController from 'src/app/http/controllers/AccountController'
import AuthController from 'src/app/http/controllers/AuthController'
import BookController from 'src/app/http/controllers/BookController'
import ExploreController from 'src/app/http/controllers/ExploreController'
import PhotoController from 'src/app/http/controllers/PhotoController'
import SpaceController from 'src/app/http/controllers/SpaceController'
import SessionController from 'src/app/http/controllers/SessionController'
import TwoFactorController from 'src/app/http/controllers/TwoFactorController'
import { Router } from '@arkstack/driver-express'
import { auth, limiter } from '@arkstack/driver-express/middlewares'

Router.get('/', () => {
  return { status: 'OK' }
})

// Auth
Router.post('/auth/register', [AuthController, 'register'], [limiter(20, 60)])
Router.post('/auth/login', [AuthController, 'login'], [limiter(20, 60)])
Router.post('/auth/two-factor', [AuthController, 'twoFactorChallenge'], [limiter(10, 60)])
Router.post('/auth/forgot-password', [AuthController, 'forgotPassword'], [limiter(5, 60)])
Router.post('/auth/reset-password', [AuthController, 'resetPassword'], [limiter(10, 60)])
Router.post('/auth/verify-email', [AuthController, 'verifyEmail'], [limiter(10, 60)])
Router.get('/auth/me', [AuthController, 'me'], [auth])
Router.post('/auth/logout', [AuthController, 'logout'], [auth])

// Account settings
Router.put('/account/profile', [AccountController, 'updateProfile'], [auth])
Router.post('/account/avatar', [AccountController, 'updateAvatar'], [auth])
Router.delete('/account/avatar', [AccountController, 'removeAvatar'], [auth])
Router.put('/account/email', [AccountController, 'updateEmail'], [auth, limiter(10, 60)])
Router.post('/account/email/verification', [AccountController, 'sendVerification'], [auth, limiter(3, 60)])
Router.put('/account/password', [AccountController, 'updatePassword'], [auth, limiter(10, 60)])
Router.put('/account/privacy', [AccountController, 'updatePrivacy'], [auth])
Router.post('/account/privacy/lock-books', [AccountController, 'lockBooks'], [auth])
Router.get('/account/export', [AccountController, 'export'], [auth, limiter(3, 60)])
Router.delete('/account', [AccountController, 'destroy'], [auth, limiter(5, 60)])

// Signed-in devices
Router.get('/account/sessions', [SessionController, 'index'], [auth])
Router.delete('/account/sessions', [SessionController, 'destroyOthers'], [auth])
Router.delete('/account/sessions/:session', [SessionController, 'destroy'], [auth])

// Two-step sign-in
Router.get('/account/two-factor', [TwoFactorController, 'show'], [auth])
Router.post('/account/two-factor/setup', [TwoFactorController, 'setup'], [auth])
Router.post('/account/two-factor', [TwoFactorController, 'enable'], [auth, limiter(10, 60)])
Router.post('/account/two-factor/recovery-codes', [TwoFactorController, 'regenerateRecoveryCodes'], [auth])
Router.delete('/account/two-factor', [TwoFactorController, 'disable'], [auth, limiter(10, 60)])

// Explore: public photos and books, open to everyone
Router.get('/explore/photos', [ExploreController, 'photos'], [limiter(120, 60)])
Router.get('/explore/photos/:photo', [ExploreController, 'photo'], [limiter(120, 60)])
Router.get('/explore/books', [ExploreController, 'books'], [limiter(120, 60)])
Router.get('/explore/spaces', [ExploreController, 'spaces'], [limiter(120, 60)])
Router.get('/explore/spaces/:space', [ExploreController, 'space'], [limiter(120, 60)])

// Spaces: a creator's collections of photos and books
Router.apiResource('/spaces', SpaceController, { middlewares: auth })

// Photo library
Router.apiResource('/photos', PhotoController, { middlewares: auth })

// Books. Opening a book works without signing in when it is shared or public.
Router.apiResource('/books', BookController, {
  middlewares: { index: auth, create: auth, update: auth, destroy: auth },
})
Router.put('/books/:book/pages', [BookController, 'savePages'], [auth])
