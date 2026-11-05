import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("signin", "routes/signin.tsx"),
	route("signup", "routes/signup.tsx"),
	route("signout", "routes/signout.tsx"),
	route("forgot-password", "routes/forgot-password.tsx"),
	route("reset-password", "routes/reset-password.tsx"),
	route("verify-email", "routes/verify-email.tsx"),

	// Signed-in area with the app header.
	layout("routes/app-layout.tsx", [
		route("books", "routes/books.tsx"),
		route("photos", "routes/photos.tsx"),
		route("settings", "routes/settings/layout.tsx", [
			index("routes/settings/index.tsx"),
			route("profile", "routes/settings/profile.tsx"),
			route("security", "routes/settings/security.tsx"),
			route("privacy", "routes/settings/privacy.tsx"),
		]),
	]),
	...prefix("settings", [route("export", "routes/settings/export.ts")]),

	// Full-screen pages.
	route("books/:id/edit", "routes/book-edit.tsx"),
	route("books/:id", "routes/book-view.tsx"),
] satisfies RouteConfig;
