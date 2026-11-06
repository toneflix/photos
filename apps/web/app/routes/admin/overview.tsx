import { Link } from "react-router";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Avatar } from "~/components/Avatar";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/overview";

export const meta = () => [{ title: "Overview · Admin · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "dashboard");
	const { data } = await api.admin.overview();

	return { overview: data, canManageUsers: user.permissions.includes("users") };
}

const number = new Intl.NumberFormat("en");

function bytes(value: number) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	const power = value > 0 ? Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024))) : 0;

	return `${(value / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`;
}

export default function AdminOverview({ loaderData }: Route.ComponentProps) {
	const { overview, canManageUsers } = loaderData;
	const stats = [
		{ label: "Accounts", value: number.format(overview.users.total), note: `${number.format(overview.users.new)} new in ${overview.newUserDays} days` },
		{ label: "Photos", value: number.format(overview.photos.total), note: `${number.format(overview.photos.public)} on Explore` },
		{ label: "Books", value: number.format(overview.books.total), note: `${number.format(overview.books.public)} public` },
		{ label: "Spaces", value: number.format(overview.spaces.total), note: `${number.format(overview.spaces.public)} public` },
		{ label: "Storage", value: bytes(overview.photos.storageBytes), note: "Stored originals" },
		{ label: "Team", value: number.format(overview.users.staff), note: `${number.format(overview.users.suspended)} accounts suspended` },
	];

	return (
		<>
			<AdminHeader title="Overview" description="How Toneflix Photos is doing at a glance." />
			<div className="space-y-8 px-4 py-8 sm:px-8">
				<dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{stats.map((stat) => (
						<div key={stat.label} className="panel p-5">
							<dt className="text-sm font-medium text-ink-500">{stat.label}</dt>
							<dd className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900">{stat.value}</dd>
							<dd className="mt-1 text-sm text-ink-500">{stat.note}</dd>
						</div>
					))}
				</dl>

				<section className="panel">
					<div className="flex items-center justify-between gap-4 border-b-[1.5px] border-surface-200 px-5 py-4">
						<h2 className="font-display text-lg font-bold text-ink-900">Newest accounts</h2>
						{canManageUsers && (
							<Link prefetch="intent" to="/admin/users" className="text-sm font-semibold text-brand-700 hover:underline">
								All users
							</Link>
						)}
					</div>
					<ul className="divide-y divide-surface-200">
						{overview.recentUsers.map((account) => (
							<li key={account.id} className="flex items-center gap-3 px-5 py-3">
								<Avatar user={account} />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-ink-900">{account.name}</p>
									<p className="truncate text-sm text-ink-500">{account.email}</p>
								</div>
								<span className="hidden text-sm text-ink-500 sm:block">
									{new Date(account.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
								</span>
							</li>
						))}
					</ul>
				</section>
			</div>
		</>
	);
}
