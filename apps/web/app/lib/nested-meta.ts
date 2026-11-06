import type { MetaDescriptor } from "react-router";

/** Meta arguments for Explore lists that also open inside a space or on a maker's profile. */
export interface NestedMetaArgs {
	params: { space?: string; maker?: string };
	matches: ({ id: string; meta: MetaDescriptor[] } | undefined)[];
}

/** The space's or maker's own title and description when a list opens inside one, else null. */
export function parentMeta({ params, matches }: NestedMetaArgs): MetaDescriptor[] | null {
	const parent = params.space ? "routes/space/layout" : params.maker ? "routes/maker/layout" : null;

	if (!parent) return null;

	return matches.find((match) => match?.id === parent)?.meta ?? [];
}
