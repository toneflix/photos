import { Link, redirect } from "react-router";
import { optionalUser } from "~/lib/session.server";
import { Logo, buttonClass } from "~/components/ui";
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
	return null;
}

export default function Home() {
	return (
		<div className="min-h-dvh bg-paper-50">
			<header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
				<Logo />
				<nav className="flex items-center gap-2">
					<Link to="/signin" className={buttonClass("ghost")}>
						Sign in
					</Link>
					<Link to="/signup" className={buttonClass("primary")}>
						Start a book
					</Link>
				</nav>
			</header>

			<main className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 pb-24 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
				<div>
					<p className="text-sm font-medium tracking-[0.2em] text-ember-600 uppercase">Digital photo books</p>
					<h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
						Your photos, bound into books that last for all time.
					</h1>
					<p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
						Upload your favourite moments, lay them out page by page, and turn through them like a real
						album. On your phone, just turn it sideways and the book opens across two pages.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Link to="/signup" className={buttonClass("primary", "px-6 py-3 text-base")}>
							Create your first book
						</Link>
						<Link to="/signin" className={buttonClass("secondary", "px-6 py-3 text-base")}>
							I have an account
						</Link>
					</div>
				</div>

				<HeroBook />
			</main>
		</div>
	);
}

/** A small, static open book for the landing page. */
function HeroBook() {
	return (
		<div className="relative mx-auto w-full max-w-xl" style={{ perspective: "1800px" }} aria-hidden>
			<div className="absolute inset-x-8 -bottom-6 h-10 rounded-[50%] bg-ink-900/30 blur-2xl" />
			<div className="relative flex aspect-[3/2] rotate-x-[8deg] shadow-2xl">
				<div className="paper relative flex-1 overflow-hidden p-[7%]">
					<div className="h-full bg-gradient-to-br from-amber-200 via-orange-300 to-rose-400 shadow-md" />
					<div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-transparent" />
				</div>
				<div className="paper relative flex flex-1 flex-col gap-[5%] overflow-hidden p-[7%]">
					<div className="flex-1 bg-gradient-to-br from-sky-300 via-teal-200 to-emerald-300 shadow-md" />
					<div className="flex-1 bg-gradient-to-br from-violet-300 via-fuchsia-200 to-pink-300 shadow-md" />
					<div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
				</div>
			</div>
		</div>
	);
}
