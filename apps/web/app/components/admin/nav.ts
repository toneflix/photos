import type { Permission } from "@photos/types";

/** The admin sidebar, in order. Each page shows to roles holding any of its permissions. */
export const ADMIN_PAGES: { to: string; label: string; icon: string; permissions: Permission[]; end?: boolean }[] = [
	{ to: "/admin", label: "Overview", icon: "gauge", permissions: ["dashboard.view"], end: true },
	{ to: "/admin/users", label: "Users", icon: "users", permissions: ["users.view", "users.manage"] },
	{ to: "/admin/photos", label: "Photos", icon: "image", permissions: ["content.moderate"] },
	{ to: "/admin/books", label: "Books", icon: "book", permissions: ["content.moderate"] },
	{ to: "/admin/spaces", label: "Spaces", icon: "grid", permissions: ["content.moderate"] },
	{ to: "/admin/roles", label: "Roles", icon: "key", permissions: ["roles.manage"] },
	{ to: "/admin/configuration", label: "Configuration", icon: "sliders", permissions: ["settings.manage"] },
];
