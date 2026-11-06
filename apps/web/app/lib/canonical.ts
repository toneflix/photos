import { redirect } from "react-router";

/**
 * A redirect to the page the visitor asked for with the path segment at `segment` set to `value`,
 * such as a maker's username or a space's web address in place of an id. Keeps the query string.
 */
export function canonicalRedirect(request: Request, segment: number, value: string): Response {
	const url = new URL(request.url);
	const path = url.pathname.replace(/(\/_root)?\.data$/, "").split("/");

	path[segment] = value;
	url.searchParams.delete("_routes");

	return redirect(`${path.join("/")}${url.search}`);
}
