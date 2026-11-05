import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { requireUser } from "~/lib/session.server";
import type { User } from "@photos/types";
import { Logo, buttonClass } from "~/components/ui";
import { Avatar } from "~/components/Avatar";
import type { Route } from "./+types/app-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireUser(request, context);
	return { user };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData;
	const { pathname } = useLocation();
	const tab = ({ isActive }: { isActive: boolean }) =>
		`rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`;

	return (
		<div className="min-h-dvh bg-surface-50">
			<header className="sticky top-0 z-20 border-b border-surface-200 bg-white/95 backdrop-blur">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
					<Logo to="/books" compact />
					<nav className="flex items-center gap-1 rounded-full bg-surface-100 p-1">
						<NavLink to="/books" className={tab}>
							Books
						</NavLink>
						<NavLink to="/photos" className={tab}>
							Photos
						</NavLink>
					</nav>
					<div className="flex items-center gap-3">
						<Link to="/photos" className={buttonClass("primary", "hidden sm:inline-flex")}>
							Upload
						</Link>
						<AccountMenu key={pathname} user={user} />
					</div>
				</div>
			</header>
			{!user.emailVerified && !pathname.startsWith("/settings/email") && (
				<div className="border-b border-amber-200 bg-amber-50">
					<p className="mx-auto max-w-7xl px-4 py-2.5 text-sm text-amber-900 sm:px-6">
						Confirm your email so you can always get back into your account.{" "}
						<Link to="/settings/email" className="font-semibold underline">
							Resend the link
						</Link>
					</p>
				</div>
			)}
			<Outlet />
		</div>
	);
}

/** The avatar button and its menu. It closes on every navigation because it is keyed by the path. */
function AccountMenu({ user }: { user: User }) {
	const item = "block rounded-md px-3 py-2 text-sm text-ink-700 hover:bg-surface-100 hover:text-ink-900";

	return (
		<details className="group relative">
			<summary className="list-none rounded-full ring-brand-500/30 transition group-open:ring-4 hover:ring-4 [&::-webkit-details-marker]:hidden" aria-label="Account">
				<Avatar user={user} />
			</summary>
			<div className="absolute right-0 mt-2 w-60 rounded-xl border border-surface-200 bg-white p-2 shadow-xl">
				<div className="px-3 py-2">
					<p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
					<p className="truncate text-xs text-ink-500">{user.email}</p>
				</div>
				<div className="my-1 border-t border-surface-200" />
				<Link to="/settings" className={item}>
					Settings
				</Link>
				<Link to="/settings/devices" className={item}>
					Devices
				</Link>
				<Link to="/settings/data" className={item}>
					Download your data
				</Link>
				<div className="my-1 border-t border-surface-200" />
				<Form method="post" action="/signout">
					<button type="submit" className={`${item} w-full text-left`}>
						Sign out
					</button>
				</Form>
			</div>
		</details>
	);
}
