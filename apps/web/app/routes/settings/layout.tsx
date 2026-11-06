import { Link, NavLink, Outlet, useLocation } from "react-router";
import { SETTINGS_GROUPS } from "~/components/settings/nav";

/**
 * Settings with a grouped sidebar on wide screens. On phones the settings home
 * is the list, and each page opens on its own with a way back.
 */
export default function SettingsLayout() {
	const { pathname } = useLocation();
	const home = pathname.replace(/\/$/, "") === "/settings";

	return (
		<main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="gap-10 md:grid md:grid-cols-[15rem_1fr]">
				<aside className="hidden md:block">
					<Link prefetch="intent" to="/settings" className="font-display font-bold tracking-tight text-3xl text-ink-900 hover:text-brand-800">
						Settings
					</Link>
					<nav className="mt-8 space-y-7" aria-label="Settings">
						{SETTINGS_GROUPS.map((group) => (
							<div key={group.label}>
								<p className="px-3 text-xs font-semibold tracking-[0.14em] text-ink-500 uppercase">{group.label}</p>
								<ul className="mt-2 space-y-0.5">
									{group.pages.map((page) => (
										<li key={page.to}>
											<NavLink prefetch="intent"
												to={page.to}
												className={({ isActive }) =>
													`block rounded-lg px-3 py-2 text-sm transition ${
														isActive
															? "bg-ink-900 font-medium text-surface-50"
															: "danger" in page
																? "text-red-700 hover:bg-red-50"
																: "text-ink-700 hover:bg-surface-200/70"
													}`
												}
											>
												{page.label}
											</NavLink>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</aside>
				<div className="min-w-0">
					{!home && (
						<Link prefetch="intent" to="/settings" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 md:hidden">
							<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
								<path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							Settings
						</Link>
					)}
					<Outlet />
				</div>
			</div>
		</main>
	);
}
