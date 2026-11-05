import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
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

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
				<meta name="theme-color" content="#ffffff" />
				<Meta />
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
	return <Outlet />;
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
