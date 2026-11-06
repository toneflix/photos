import { NavLink, Outlet } from "react-router";

const tab = ({ isActive }: { isActive: boolean }) =>
	`-mb-[1.5px] border-b-[3px] px-1 pb-3 text-sm font-semibold transition ${
		isActive ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-900"
	}`;

/** The Explore heading with its Photos and Books tabs. */
export default function ExploreFeed() {
	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">Explore</h1>
			<p className="mt-2 max-w-xl text-ink-500">Photos, books and spaces people chose to share with everyone.</p>
			<nav className="mt-8 flex gap-6 border-b-[1.5px] border-surface-200">
				<NavLink to="/explore" end className={tab}>
					Photos
				</NavLink>
				<NavLink to="/explore/books" className={tab}>
					Books
				</NavLink>
				<NavLink to="/explore/spaces" className={tab}>
					Spaces
				</NavLink>
			</nav>
			<div className="mt-8">
				<Outlet />
			</div>
		</main>
	);
}
