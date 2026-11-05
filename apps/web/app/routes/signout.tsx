import { redirect } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { clearToken } from "~/lib/session.server";
import type { Route } from "./+types/signout";

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	try {
		await (await getServerApi(request, env)).auth.logout();
	} catch {
		// The token may already be gone; signing out locally is enough.
	}
	return redirect("/", { headers: { "Set-Cookie": await clearToken(request) } });
}

export const loader = () => redirect("/");
