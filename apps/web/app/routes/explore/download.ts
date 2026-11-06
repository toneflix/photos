import { cloudflareContext } from "~/lib/cloudflare";
import { ApiDownload } from "~/lib/download.server";
import type { Route } from "./+types/download";

/** Streams an openly licensed public photo at the size asked for. The API refuses photos whose owner keeps all rights. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);

	return new ApiDownload(request, env).fetch(
		`/explore/photos/${encodeURIComponent(params.id)}/download${ApiDownload.sizeQuery(request)}`,
		{},
		{
			403: "The photographer keeps all rights to this photo, so it can't be downloaded.",
			404: "This photo isn't public anymore.",
		},
	);
}
