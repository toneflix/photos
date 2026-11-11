import { Link, redirect } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { optionalUser } from "~/lib/session.server";
import { PublicPhotoGrid } from "~/components/explore/PublicPhotoGrid";
import { Logo, buttonClass } from "~/components/ui";
import { Mosaic } from "~/components/Mosaic";
import { SiteFooter } from "~/components/SiteFooter";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Toneflix Photos · Beautiful photos, taken by beautiful people" },
		{
			name: "description",
			content: "Beautiful photos, taken by beautiful people. Find work you love and share your own.",
		},
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	if (await optionalUser(request, context)) throw redirect("/books");

	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);
	const fresh = await api.explore
		.photos({ per_page: 16 })
		.then(({ data }) => data)
		.catch(() => []);

	return { deleted: new URL(request.url).searchParams.has("deleted"), fresh };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-dvh bg-canvas">
			{loaderData.deleted && (
				<p className="bg-ink-900 px-6 py-3 text-center text-sm text-white">
					Your account and everything in it was deleted. Thank you for sharing your photos with us.
				</p>
			)}

			<section className="relative isolate overflow-hidden bg-ink-900">
				<Mosaic columns={7} className="absolute -inset-x-10 -top-10 -z-10 opacity-70" />
				<div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
				<header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
					<Logo light />
					<nav className="flex items-center gap-1 sm:gap-2">
						<Link prefetch="intent" to="/explore" className={buttonClass("ghost", "!text-white hover:!bg-white/10 max-sm:hidden")}>
							Explore
						</Link>
						<Link prefetch="intent" to="/signin" className={buttonClass("ghost", "!text-white hover:!bg-white/10")}>
							Sign in
						</Link>
						<Link prefetch="intent" to="/signup" className={buttonClass("primary")}>
							Join free
						</Link>
					</nav>
				</header>
				<div className="mx-auto max-w-3xl px-4 pt-20 pb-28 text-center sm:px-6 sm:pt-28 sm:pb-36">
					<h1 className="font-display text-4xl leading-tight font-extrabold tracking-tight text-white sm:text-6xl">
						Beautiful photos, taken by beautiful people.
					</h1>
					<p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
						Find work you love and share your own.
					</p>
					<div className="mt-9 flex flex-wrap justify-center gap-3">
						<Link prefetch="intent" to="/signup" className={buttonClass("primary", "px-6 py-3.5 text-base")}>
							Get started free
						</Link>
						<Link
							prefetch="intent"
							to="/signin"
							className={buttonClass("secondary", "px-6 py-3.5 text-base !border-white/30 !bg-white/10 !text-white hover:!bg-white/20")}
						>
							I have an account
						</Link>
					</div>
				</div>
			</section>

			<main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{FEATURES.map((feature) => (
						<div key={feature.title} className="panel rounded-xl p-6">
							<p className="font-display text-lg font-bold text-ink-900">{feature.title}</p>
							<p className="mt-2 text-ink-500">{feature.text}</p>
						</div>
					))}
				</div>

				{loaderData.fresh.length > 0 && (
					<section className="mt-20">
						<div className="mb-6 flex items-end justify-between gap-4">
							<h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">Fresh on Explore</h2>
							<Link prefetch="intent" to="/explore" className="text-sm font-semibold text-brand-700 hover:underline">
								See more
							</Link>
						</div>
						<PublicPhotoGrid photos={loaderData.fresh} />
					</section>
				)}
			</main>
			<SiteFooter />
		</div>
	);
}

const FEATURES = [
	{ title: "Share your photos", text: "Post your best shots with the licence you pick, for a few people or for everyone on Explore." },
	{ title: "Group photos in spaces", text: "Keep photos and books from an event, a trip or a project in one place, and choose who sees it." },
	{ title: "Make photo books", text: "Lay out pages on real-looking paper and turn them like a printed album." },
	{ title: "Get found", text: "Your profile shows the photos, books and spaces you share, so people can find more of your work." },
];
