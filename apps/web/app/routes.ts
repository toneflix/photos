import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("signin", "routes/signin.tsx"),
	route("signup", "routes/signup.tsx"),
	route("signout", "routes/signout.tsx"),

	// Signed-in area with the app header.
	layout("routes/app-layout.tsx", [
		route("books", "routes/books.tsx"),
		route("photos", "routes/photos.tsx"),
	]),

	// Full-screen pages.
	route("books/:id/edit", "routes/book-edit.tsx"),
	route("books/:id", "routes/book-view.tsx"),
] satisfies RouteConfig;
