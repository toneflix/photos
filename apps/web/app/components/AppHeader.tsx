import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router";
import type { User } from "@photos/types";
import { Logo, buttonClass } from "~/components/ui";
import { AccountMenu } from "~/components/AccountMenu";

const tab = ({ isActive }: { isActive: boolean }) =>
	`rounded-full px-2.5 py-2 text-center text-sm font-semibold transition max-sm:flex-1 sm:px-4 ${isActive ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-white"}`;

/** The top bar. Signed-in people get their library tabs, on a row of their own on phones; visitors get Explore and a way in. Its height is kept in `--header-height` for content that sticks below it. */
export function AppHeader({ user }: { user: User | null }) {
	const { pathname } = useLocation();
	const header = useRef<HTMLElement>(null);

	useEffect(() => {
		const element = header.current;

		if (!element) return;

		const root = document.documentElement;
		const observer = new ResizeObserver(() => root.style.setProperty("--header-height", `${element.offsetHeight}px`));

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	return (
		<header ref={header} className="sticky top-0 z-20 border-b-[1.5px] border-surface-200 bg-white/95 backdrop-blur">
			<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
				<Logo to={user ? "/books" : "/"} compact />
				<nav className={`flex items-center gap-1 rounded-full border-[1.5px] border-surface-200 bg-surface-100 p-1 ${user ? "max-sm:order-last max-sm:w-full" : ""}`}>
					{user && (
						<>
							<NavLink prefetch="intent" to="/books" className={tab}>
								Books
							</NavLink>
							<NavLink prefetch="intent" to="/photos" className={tab}>
								Photos
							</NavLink>
							<NavLink prefetch="intent" to="/spaces" end className={tab}>
								Spaces
							</NavLink>
						</>
					)}
					<NavLink prefetch="intent" to="/explore" className={tab}>
						Explore
					</NavLink>
				</nav>
				{user ? (
					<div className="flex items-center gap-3">
						<Link prefetch="intent" to="/photos" className={buttonClass("primary", "max-sm:hidden")}>
							Upload
						</Link>
						<AccountMenu key={pathname} user={user} />
					</div>
				) : (
					<div className="flex items-center gap-1 sm:gap-2">
						<Link prefetch="intent" to="/pricing" className={buttonClass("ghost", "max-md:hidden")}>
							Pricing
						</Link>
						<Link prefetch="intent" to="/unlock" className={buttonClass("ghost", "max-lg:hidden")}>
							Have a code?
						</Link>
						<Link prefetch="intent" to={`/signin?next=${encodeURIComponent(pathname)}`} className={buttonClass("ghost", "max-sm:hidden")}>
							Sign in
						</Link>
						<Link prefetch="intent" to="/signup" className={buttonClass("primary")}>
							Join free
						</Link>
					</div>
				)}
			</div>
		</header>
	);
}
