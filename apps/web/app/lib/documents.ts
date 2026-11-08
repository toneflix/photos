import { useRouteLoaderData } from "react-router";
import { BUILT_IN_DOCUMENTS, type DocumentSummary } from "@photos/types";

const BUILT_IN: string[] = Object.values(BUILT_IN_DOCUMENTS);

/** Where a page lives: `/privacy`, `/terms` and `/about` for the built-in ones, `/pages/:slug` for the rest. */
export function documentPath(document: Pick<DocumentSummary, "slug">): string {
	return BUILT_IN.includes(document.slug) ? `/${document.slug}` : `/pages/${document.slug}`;
}

/** The slug a page route was opened at, from `:slug` or a built-in page's own path. */
export function documentSlug(request: Request, slug?: string): string {
	return (
		slug ??
		new URL(request.url).pathname
			.replace(/(\/_root)?\.data$/, "")
			.split("/")
			.filter(Boolean)[0]
	);
}

/** Published pages and policies, loaded once per page load by the root route. */
export function useDocuments(): DocumentSummary[] {
	return (useRouteLoaderData("root") as { documents?: DocumentSummary[] } | undefined)?.documents ?? [];
}
