import { Link, NavLink, useLocation } from "react-router";
import type { User } from "@photos/types";
import { Logo, buttonClass } from "~/components/ui";
import { AccountMenu } from "~/components/AccountMenu";

const tab = ({ isActive }: { isActive: boolean }) =>
	`rounded-full px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${isActive ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`;

/** The top bar. Signed-in people get their library tabs; visitors get Explore and a way in. */
export function AppHeader({ user }: { user: User | null }) {
	const { pathname } = useLocation();

	return (
		<header className="sticky top-0 z-20 border-b border-surface-200 bg-white/95 backdrop-blur">
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
				<Logo to={user ? "/books" : "/"} compact />
				<nav className="flex items-center gap-1 rounded-full bg-surface-100 p-1">
					{user && (
						<>
							<NavLink to="/books" className={tab}>
								Books
							</NavLink>
							<NavLink to="/photos" className={tab}>
								Photos
							</NavLink>
						</>
					)}
					<NavLink to="/explore" className={tab}>
						Explore
					</NavLink>
				</nav>
				{user ? (
					<div className="flex items-center gap-3">
						<Link to="/photos" className={buttonClass("primary", "max-sm:hidden")}>
							Upload
						</Link>
						<AccountMenu key={pathname} user={user} />
					</div>
				) : (
					<div className="flex items-center gap-1 sm:gap-2">
						<Link to={`/signin?next=${encodeURIComponent(pathname)}`} className={buttonClass("ghost", "max-sm:hidden")}>
							Sign in
						</Link>
						<Link to="/signup" className={buttonClass("primary")}>
							Join free
						</Link>
					</div>
				)}
			</div>
		</header>
	);
}
