import type { AdminPermission } from "@photos/types";

/** The admin sidebar, in order. Each page shows only to roles with its permission. */
export const ADMIN_PAGES: { to: string; label: string; icon: string; permission: AdminPermission; end?: boolean }[] = [
	{ to: "/admin", label: "Overview", icon: "gauge", permission: "dashboard", end: true },
	{ to: "/admin/users", label: "Users", icon: "users", permission: "users" },
	{ to: "/admin/moderation", label: "Moderation", icon: "shield", permission: "moderation" },
	{ to: "/admin/configuration", label: "Configuration", icon: "sliders", permission: "settings" },
];
