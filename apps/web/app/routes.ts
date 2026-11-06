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
		route("invites", "routes/invites.tsx"),
		route("books/:id/access", "routes/book-access.tsx"),
		route("checkout/complete", "routes/checkout-complete.tsx"),
		route("stats", "routes/stats/overview.tsx"),
		route("stats/:kind/:id", "routes/stats/item.tsx"),
		route("settings", "routes/settings/layout.tsx", [
			index("routes/settings/index.tsx"),
			route("profile", "routes/settings/profile.tsx"),
			route("email", "routes/settings/email.tsx"),
			route("plan", "routes/settings/plan.tsx"),
			route("password", "routes/settings/password.tsx"),
			route("two-step", "routes/settings/two-step.tsx"),
			route("devices", "routes/settings/devices.tsx"),
			route("sharing", "routes/settings/sharing.tsx"),
			route("data", "routes/settings/data.tsx"),
			route("delete-account", "routes/settings/delete-account.tsx"),
		]),
	]),
	...prefix("settings", [route("export", "routes/settings/export.ts")]),

	// Admin dashboard. Each page needs a role that grants it.
	...prefix("admin", [
		layout("routes/admin/layout.tsx", [
			index("routes/admin/overview.tsx"),
			route("users", "routes/admin/users.tsx"),
			route("users/:id", "routes/admin/user.tsx"),
			...(["photos", "books", "spaces"] as const).flatMap((kind) => [
				route(kind, "routes/admin/content.tsx", { id: `admin-${kind}` }),
				route(`${kind}/:id`, "routes/admin/content-item.tsx", { id: `admin-${kind}-item` }),
			]),
			route("plans/:plan?", "routes/admin/plans.tsx"),
			route("payment-regions/:region?", "routes/admin/payment-regions.tsx"),
			route("roles/:role?", "routes/admin/roles.tsx"),
			route("configuration/:group?", "routes/admin/configuration.tsx"),
		]),
	]),

	// Public timeline, open to everyone.
	layout("routes/explore/layout.tsx", [
		layout("routes/explore/feed.tsx", [
			route("explore", "routes/explore/photos.tsx"),
			route("explore/books", "routes/explore/books.tsx"),
			route("explore/spaces", "routes/explore/spaces.tsx"),
		]),
		route("explore/photos/:id", "routes/explore/photo.tsx"),

		// A space's page: Explore kept to one space.
		route("spaces/:space", "routes/space/layout.tsx", [
			index("routes/explore/photos.tsx", { id: "space-photos" }),
			route("books", "routes/explore/books.tsx", { id: "space-books" }),
			route("members", "routes/space/members.tsx"),
		]),

		// A maker's profile: Explore kept to one maker's public work.
		route("makers/:maker", "routes/maker/layout.tsx", [
			index("routes/explore/photos.tsx", { id: "maker-photos" }),
			route("books", "routes/explore/books.tsx", { id: "maker-books" }),
			route("spaces", "routes/explore/spaces.tsx", { id: "maker-spaces" }),
		]),
		route("licenses", "routes/licenses.tsx"),
		route("pricing", "routes/pricing.tsx"),
	]),
	route("explore/photos/:id/download", "routes/explore/download.ts"),
	route("photos/:id/download", "routes/photo-download.ts"),
	route("books/:id/download", "routes/book-download.ts"),
	route("explore/photos/:id/preview", "routes/explore/preview.ts"),
	route("books/:id/cover", "routes/book-cover.ts"),

	// Full-screen pages.
	route("books/:id/edit", "routes/book-edit.tsx"),
	route("books/:id", "routes/book-view.tsx"),
	route("books/:id/view", "routes/book-view.tsx", { id: "book-fullscreen" }),
] satisfies RouteConfig;
