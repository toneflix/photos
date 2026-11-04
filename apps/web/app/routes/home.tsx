import { cloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Toneflix Photos" },
		{
			name: "description",
			content: "A digital photo book to keep your photos for all time.",
		},
	];
}

export function loader({ context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	return { apiUrl: env.API_URL };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
			<h1 className="text-4xl font-semibold tracking-tight">Toneflix Photos</h1>
			<p className="max-w-md text-gray-600 dark:text-gray-300">
				Your photos, bound into books you can keep for all time.
			</p>
			<p className="text-xs text-gray-400">API: {loaderData.apiUrl}</p>
		</main>
	);
}
