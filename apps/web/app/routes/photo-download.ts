import { cloudflareContext } from "~/lib/cloudflare";
import { ApiDownload } from "~/lib/download.server";
import { requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/photo-download";

/** Streams one of the signed-in owner's photos at the size asked for, whatever its licence. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const { token } = await requireSignIn(request, context);

	return new ApiDownload(request, env).fetch(
		`/photos/${encodeURIComponent(params.id)}/download${ApiDownload.sizeQuery(request)}`,
		{ Authorization: `Bearer ${token}` },
		{
			404: "This photo isn't in your library anymore.",
		},
	);
}
