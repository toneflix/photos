import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("signin", "routes/signin.tsx"),
	route("signup", "routes/signup.tsx"),
	route("signout", "routes/signout.tsx"),
	route("forgot-password", "routes/forgot-password.tsx"),
	route("reset-password", "routes/reset-password.tsx"),
	route("verify-email", "routes/verify-email.tsx"),
	route("unlock", "routes/unlock.tsx"),

	// Signed-in area with the app header.
	layout("routes/app-layout.tsx", [
		route("books", "routes/books.tsx"),
		route("photos", "routes/photos.tsx"),
		route("spaces", "routes/spaces.tsx"),
		route("books/:id/access", "routes/book-access.tsx"),
		route("settings", "routes/settings/layout.tsx", [
			index("routes/settings/index.tsx"),
			route("profile", "routes/settings/profile.tsx"),
			route("email", "routes/settings/email.tsx"),
			route("password", "routes/settings/password.tsx"),
			route("two-step", "routes/settings/two-step.tsx"),
			route("devices", "routes/settings/devices.tsx"),
			route("sharing", "routes/settings/sharing.tsx"),
			route("data", "routes/settings/data.tsx"),
			route("delete-account", "routes/settings/delete-account.tsx"),
		]),
	]),
	...prefix("settings", [route("export", "routes/settings/export.ts")]),

	// Public timeline, open to everyone.
	layout("routes/explore/layout.tsx", [
		layout("routes/explore/feed.tsx", [
			route("explore", "routes/explore/photos.tsx"),
			route("explore/books", "routes/explore/books.tsx"),
			route("explore/spaces", "routes/explore/spaces.tsx"),
		]),
		route("explore/photos/:id", "routes/explore/photo.tsx"),

		// A space's page: Explore kept to one space.
		route("spaces/:slug", "routes/space/layout.tsx", [
			index("routes/explore/photos.tsx", { id: "space-photos" }),
			route("books", "routes/explore/books.tsx", { id: "space-books" }),
		]),
		route("licenses", "routes/licenses.tsx"),
	]),
	route("explore/photos/:id/download", "routes/explore/download.ts"),

	// Full-screen pages.
	route("books/:id/edit", "routes/book-edit.tsx"),
	route("books/:id", "routes/book-view.tsx"),
] satisfies RouteConfig;
