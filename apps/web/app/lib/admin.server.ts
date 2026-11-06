import type { AdminPermission } from "@photos/types";
import type { RouterContextProvider } from "react-router";
import { requireUser } from "./session.server";

/**
 * The signed-in user, when their role opens `permission` (or any admin area when
 * none is given). Everyone else gets a 404, so the dashboard stays out of sight.
 */
export async function requireAdmin(request: Request, context: Readonly<RouterContextProvider>, permission?: AdminPermission) {
	const session = await requireUser(request, context);
	const allowed = permission ? session.user.permissions.includes(permission) : session.user.permissions.length > 0;

	if (!allowed) throw new Response("Not found", { status: 404 });

	return session;
}
