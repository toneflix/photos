import { Link, NavLink, Outlet } from "react-router";
import { ADMIN_PAGES } from "~/components/admin/nav";
import { Icon } from "~/components/admin/Icon";
import { Logo } from "~/components/ui";
import { requireAdmin } from "~/lib/admin.server";
import { revalidateOnSubmit } from "~/lib/revalidate";
import type { Route } from "./+types/layout";

export const meta = () => [{ title: "Admin · Toneflix Photos" }, { name: "robots", content: "noindex" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireAdmin(request, context);

	return { user };
}

export const shouldRevalidate = revalidateOnSubmit;

/** The admin dashboard: a sidebar of the areas the signed-in role can open, beside the page. */
export default function AdminLayout({ loaderData }: Route.ComponentProps) {
	const pages = ADMIN_PAGES.filter((page) => loaderData.user.permissions.includes(page.permission));
	const item = (isActive: boolean) =>
		`flex items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
			isActive ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface-100 hover:text-ink-900"
		}`;

	return (
		<div className="min-h-dvh bg-canvas md:grid md:grid-cols-[16rem_1fr]">
			<aside className="border-b-[1.5px] border-surface-200 bg-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-r-[1.5px] md:border-b-0">
				<div className="flex items-center justify-between gap-3 px-4 py-4 md:px-5 md:py-6">
					<Logo to="/admin" />
					<Link prefetch="intent" to="/books" className="text-sm font-medium text-ink-500 hover:text-ink-900 md:hidden">
						Back to app
					</Link>
				</div>
				<p className="hidden px-5 text-xs font-semibold tracking-[0.14em] text-ink-500 uppercase md:block">Admin</p>
				<nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-2 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
					{pages.map((page) => (
						<NavLink key={page.to} prefetch="intent" to={page.to} end={page.end} className={({ isActive }) => item(isActive)}>
							<Icon name={page.icon} />
							{page.label}
						</NavLink>
					))}
				</nav>
				<div className="hidden border-t-[1.5px] border-surface-200 p-3 md:block">
					<Link prefetch="intent" to="/books" className={item(false)}>
						<Icon name="back" />
						Back to app
					</Link>
				</div>
			</aside>
			<div className="min-w-0">
				<Outlet />
			</div>
		</div>
	);
}

