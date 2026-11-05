import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { requireUser } from "~/lib/session.server";
import { Logo } from "~/components/ui";
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
		`rounded-full px-4 py-2 text-sm font-medium transition ${
			isActive ? "bg-ink-900 text-paper-50" : "text-ink-700 hover:bg-paper-200/70"
		}`;

	return (
		<div className="min-h-dvh bg-paper-50">
			<header className="sticky top-0 z-20 border-b border-paper-200 bg-paper-50/90 backdrop-blur">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
					<Logo to="/books" compact />
					<nav className="flex items-center gap-1">
						<NavLink to="/books" className={tab}>
							Books
						</NavLink>
						<NavLink to="/photos" className={tab}>
							Photos
						</NavLink>
					</nav>
					<div className="flex items-center gap-3">
						<Link to="/settings" title="Settings" aria-label="Settings" className="rounded-full ring-ember-500/40 transition hover:ring-4">
							<Avatar user={user} />
						</Link>
						<Form method="post" action="/signout">
							<button type="submit" className="text-sm text-ink-500 hover:text-ink-900">
								Sign out
							</button>
						</Form>
					</div>
				</div>
			</header>
			{!user.emailVerified && !pathname.startsWith("/settings/email") && (
				<div className="border-b border-amber-200 bg-amber-50">
					<p className="mx-auto max-w-7xl px-4 py-2.5 text-sm text-amber-900 sm:px-6">
						Confirm your email so you can always get back into your account.{" "}
						<Link to="/settings/email" className="font-medium underline">
							Resend the link
						</Link>
					</p>
				</div>
			)}
			<Outlet />
		</div>
	);
}
