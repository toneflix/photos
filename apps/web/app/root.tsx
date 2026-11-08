import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useMatches,
} from "react-router";

import { DEFAULT_LIMITS } from "@photos/types";
import type { Route } from "./+types/root";
import { NavigationProgress } from "./components/NavigationProgress";
import { Toaster } from "./components/Toaster";
import { cloudflareContext } from "./lib/cloudflare";
import { getServerApi } from "./lib/api.server";
import { PreviewImage } from "./lib/preview-image";
import "@toneflix/flipbook-react/style.css";
import "./app.css";

export const links: Route.LinksFunction = () => [
	{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
	{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
	{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
	{ rel: "manifest", href: "/site.webmanifest" },
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@500..800&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);
	const limits = await api
		.limits()
		.then(({ data }) => data)
		.catch(() => DEFAULT_LIMITS);

	return { origin: new URL(request.url).origin, limits };
}

export const shouldRevalidate = () => false;

/** Share tags every page carries, with the site's logo card where a page has no image of its own. */
function ShareDefaults() {
	const matches = useMatches();
	const image = PreviewImage.ownedBy(matches) ? null : PreviewImage.from(matches).site();

	return (
		<>
			<meta property="og:site_name" content="Toneflix Photos" />
			<meta name="twitter:card" content="summary_large_image" />
			{image && (
				<>
					<meta property="og:image" content={image} />
					<meta property="og:image:width" content="1200" />
					<meta property="og:image:height" content="630" />
					<meta property="og:image:alt" content="Toneflix Photos" />
					<meta name="twitter:image" content={image} />
				</>
			)}
		</>
	);
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
				<meta name="theme-color" content="#ffffff" />
				<Meta />
				<ShareDefaults />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<>
			<NavigationProgress />
			<Outlet />
			<Toaster />
		</>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Something went wrong";
	let details = "An unexpected error occurred. Please try again.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "Page not found" : "Something went wrong";
		details =
			error.status === 404
				? "This page doesn't exist, or the book is private."
				: error.statusText || (typeof error.data === "string" ? error.data : details);
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
			<h1 className="font-serif text-4xl">{message}</h1>
			<p className="text-ink-500">{details}</p>
			<a href="/books" className="mt-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-surface-50">
				Back to your books
			</a>
			{stack && (
				<pre className="mt-6 w-full overflow-x-auto rounded-lg bg-surface-100 p-4 text-left text-xs">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
