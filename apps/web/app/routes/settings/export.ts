import { cloudflareContext } from "~/lib/cloudflare";
import { ApiDownload } from "~/lib/download.server";
import { requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/export";

/** Streams the account zip from the API, which needs the token the browser never sees. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const { token } = await requireSignIn(request, context);

	return new ApiDownload(request, env).fetch("/account/export", { Authorization: `Bearer ${token}` }, {});
}
