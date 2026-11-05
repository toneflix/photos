import { Form, NavLink, Outlet } from "react-router";
import { requireUser } from "~/lib/session.server";
import { Logo } from "~/components/ui";
import type { Route } from "./+types/app-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireUser(request, context);
	return { user };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData;
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
						<span className="hidden h-9 w-9 items-center sm:flex justify-center rounded-full bg-ember-500 text-sm font-semibold text-white" title={user.email}>
							{initials(user.name)}
						</span>
						<Form method="post" action="/signout">
							<button type="submit" className="text-sm text-ink-500 hover:text-ink-900">
								Sign out
							</button>
						</Form>
					</div>
				</div>
			</header>
			<Outlet />
		</div>
	);
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}
