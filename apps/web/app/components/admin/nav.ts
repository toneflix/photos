import type { Permission } from "@photos/types";

/** The admin sidebar, in order. Each page shows to roles holding any of its permissions. */
export const ADMIN_PAGES: { to: string; label: string; icon: string; permissions: Permission[]; end?: boolean }[] = [
	{ to: "/admin", label: "Overview", icon: "gauge", permissions: ["dashboard.view"], end: true },
	{ to: "/admin/users", label: "Users", icon: "users", permissions: ["users.view", "users.manage"] },
	{ to: "/admin/moderation", label: "Moderation", icon: "shield", permissions: ["content.moderate"] },
	{ to: "/admin/roles", label: "Roles", icon: "key", permissions: ["roles.manage"] },
	{ to: "/admin/configuration", label: "Configuration", icon: "sliders", permissions: ["settings.manage"] },
];
