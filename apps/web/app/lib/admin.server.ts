import type { Permission, UserRole } from "@photos/types";
import { formError, type ServerApi } from "./api.server";
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

/** Saves a role change or a suspension posted by `AccountControls`, or a plan posted by `PlanControl`. */
export async function updateAccount(api: ServerApi, form: FormData) {
	const id = String(form.get("id"));

	try {
		if (form.get("intent") === "role") await api.admin.updateUser(id, { role: String(form.get("role")) as UserRole });
		if (form.get("intent") === "suspend") await api.admin.updateUser(id, { suspended: form.get("suspended") === "true" });
		if (form.get("intent") === "plan") await api.admin.setUserPlan(id, { plan: String(form.get("plan")), cycles: Number(form.get("cycles")) || 1 });

		return { error: null };
	} catch (error) {
		return { error: formError(error).error };
	}
}
