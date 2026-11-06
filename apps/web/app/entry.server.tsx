import type { EntryContext, HandleDataRequestFunction, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
	_loadContext: RouterContextProvider,
) {
	let shellRendered = false;
	const userAgent = request.headers.get("user-agent");

	const body = await renderToReadableStream(
		<ServerRouter context={routerContext} url={request.url} />,
		{
			onError(error: unknown) {
				responseStatusCode = 500;
				// Log streaming rendering errors from inside the shell.  Don't log
				// errors encountered during initial shell rendering since they'll
				// reject and get logged in handleDocumentRequest.
				if (shellRendered) {
					console.error(error);
				}
			},
		},
	);
	shellRendered = true;

	// Ensure requests from bots and SPA Mode renders wait for all content to load before responding
	// https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
	if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
		await body.allReady;
	}

	responseHeaders.set("Content-Type", "text/html");
	return new Response(body, {
		headers: responseHeaders,
		status: responseStatusCode,
	});
}

/**
 * Page data that a link prefetches on hover or touch stays in the browser's
 * cache for a few seconds, so the click that follows opens it straight away.
 */
export const handleDataRequest: HandleDataRequestFunction = (response, { request }) => {
	const prefetch = request.headers.get("sec-purpose")?.startsWith("prefetch") || request.headers.get("purpose") === "prefetch";
	const cacheable = request.method === "GET" && response.status === 200 && !response.headers.has("Set-Cookie") && !response.headers.has("Cache-Control");

	if (prefetch && cacheable) {
		response.headers.set("Cache-Control", "private, max-age=5");
		response.headers.append("Vary", "Cookie");
	}

	return response;
};
