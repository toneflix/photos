import { Link, redirect } from "react-router";
import { optionalUser } from "~/lib/session.server";
import { Logo, buttonClass } from "~/components/ui";
import { Mosaic } from "~/components/Mosaic";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Toneflix Photos — photo books for all time" },
		{
			name: "description",
			content: "Bind your photos into beautiful books you can page through and keep for all time.",
		},
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	if (await optionalUser(request, context)) throw redirect("/books");
	return { deleted: new URL(request.url).searchParams.has("deleted") };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-dvh bg-white">
			{loaderData.deleted && (
				<p className="bg-ink-900 px-6 py-3 text-center text-sm text-white">
					Your account and everything in it was deleted. Thank you for keeping your memories with us.
				</p>
			)}

			<section className="bg-gold-glow relative isolate overflow-hidden">
				<Mosaic columns={7} className="absolute -inset-x-10 -top-10 -z-10 opacity-60 mix-blend-soft-light" />
				<header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
					<Logo />
					<nav className="flex items-center gap-1 sm:gap-2">
						<Link to="/signin" className={buttonClass("ghost", "!text-ink-900 hover:!bg-black/5")}>
							Sign in
						</Link>
						<Link to="/signup" className={buttonClass("dark")}>
							Join free
						</Link>
					</nav>
				</header>
				<div className="mx-auto max-w-3xl px-4 pt-20 pb-28 text-center sm:px-6 sm:pt-28 sm:pb-36">
					<h1 className="font-display text-4xl leading-tight font-extrabold tracking-tight text-ink-900 sm:text-6xl">
						Your photos, bound into books that last for all time.
					</h1>
					<p className="mx-auto mt-5 max-w-xl text-lg text-ink-900/75">
						Upload your favourite moments, lay them out page by page, and turn through them like a real album. On your phone,
						turn it sideways and the book opens across two pages.
					</p>
					<div className="mt-9 flex flex-wrap justify-center gap-3">
						<Link to="/signup" className={buttonClass("dark", "px-6 py-3.5 text-base")}>
							Create your first book
						</Link>
						<Link to="/signin" className={buttonClass("secondary", "px-6 py-3.5 text-base !border-transparent")}>
							I have an account
						</Link>
					</div>
				</div>
			</section>

			<main className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:grid-cols-3 sm:px-6">
				{FEATURES.map((feature) => (
					<div key={feature.title} className="rounded-xl border border-surface-200 p-6">
						<p className="font-display text-lg font-bold text-ink-900">{feature.title}</p>
						<p className="mt-2 text-ink-500">{feature.text}</p>
					</div>
				))}
			</main>
		</div>
	);
}

const FEATURES = [
	{ title: "Keep every original", text: "Your photos are stored at full quality, and you can download all of them whenever you like." },
	{ title: "Lay out real pages", text: "Full-bleed, framed, pairs, grids and pages of words, on ivory, white, kraft or charcoal paper." },
	{ title: "Share only what you choose", text: "Books are private until you share them, with a link or with everyone." },
];
