import type { Permission } from "@photos/types";
import type { RouterContextProvider } from "react-router";
import { requireUser } from "./session.server";

/**
 * The signed-in user, when their role holds any of `permissions` (or any permission
 * at all when none are given). Everyone else gets a 404, so the dashboard stays out of sight.
 */
export async function requireAdmin(request: Request, context: Readonly<RouterContextProvider>, ...permissions: Permission[]) {
	const session = await requireUser(request, context);
	const granted = session.user.permissions;
	const allowed = permissions.length ? permissions.some((permission) => granted.includes(permission)) : granted.length > 0;

	if (!allowed) throw new Response("Not found", { status: 404 });

	return session;
}
