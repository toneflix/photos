import type { ServerApi } from "./api.server";

/**
 * Loads the user's spaces and a library list kept to the `?space=` one, both
 * at once. A space that isn't theirs falls back to the whole library.
 */
export async function spaceFiltered<T>(url: URL, api: ServerApi, list: (space?: string) => Promise<T>) {
	const requested = url.searchParams.get("space") || undefined;
	const filtered = list(requested).then(
		(result) => ({ result }),
		(error: unknown) => ({ error }),
	);

	const [{ data: spaces }, first] = await Promise.all([api.spaces.list({ per_page: 100 }), filtered]);
	const space = spaces.find((item) => item.id === requested) ?? null;

	if (requested && !space) return { spaces, space, result: await list() };
	if ("error" in first) throw first.error;

	return { spaces, space, result: first.result };
}
