import type { Space } from "@photos/types";
import type { ServerApi } from "./api.server";

/** The spaces the user can put work in: their own, then the shared ones that let them add. */
export async function workSpaces(api: ServerApi): Promise<Space[]> {
	const [{ data: owned }, { data: shared }] = await Promise.all([api.spaces.list({ per_page: 100 }), api.spaces.shared({ per_page: 100 })]);

	return [...owned, ...shared.filter((space) => space.permissions.includes("create"))];
}

/**
 * Loads the spaces the user can put work in and a library list kept to the `?space=`
 * one, both at once. A space they can't use falls back to the whole library.
 */
export async function spaceFiltered<T>(url: URL, api: ServerApi, list: (space?: string) => Promise<T>) {
	const requested = url.searchParams.get("space") || undefined;
	const filtered = list(requested).then(
		(result) => ({ result }),
		(error: unknown) => ({ error }),
	);

	const [spaces, first] = await Promise.all([workSpaces(api), filtered]);
	const space = spaces.find((item) => item.id === requested) ?? null;

	if (requested && !space) return { spaces, space, result: await list() };
	if ("error" in first) throw first.error;

	return { spaces, space, result: first.result };
}
