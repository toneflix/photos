import { Link } from "react-router";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Avatar } from "~/components/Avatar";
import { StatTiles, StatsChart } from "~/components/admin/StatsChart";
import { TopList } from "~/components/admin/ContentParts";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/overview";

export const meta = () => [{ title: "Overview · Admin · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "dashboard.view");
	const { data } = await api.admin.overview();

	return {
		overview: data,
		canManageUsers: user.permissions.some((permission) => permission === "users.view" || permission === "users.manage"),
		canModerate: user.permissions.includes("content.moderate"),
	};
}

const number = new Intl.NumberFormat("en");

function bytes(value: number) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	const power = value > 0 ? Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024))) : 0;

	return `${(value / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`;
}

export default function AdminOverview({ loaderData }: Route.ComponentProps) {
	const { overview, canManageUsers, canModerate } = loaderData;
	const stats = [
		{ label: "Views", value: number.format(overview.engagement.views), note: `${number.format(overview.daily.reduce((sum, day) => sum + day.views, 0))} in the last 30 days` },
		{ label: "Downloads", value: number.format(overview.engagement.downloads), note: `${number.format(overview.daily.reduce((sum, day) => sum + day.downloads, 0))} in the last 30 days` },
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
				<StatTiles items={stats} />

				<div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
					<StatsChart days={overview.daily} title="Views and downloads, last 30 days" />
					<TopList title="Most viewed photos" items={overview.topPhotos} kind="photos" linked={canModerate} />
				</div>

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
									<p className="truncate text-sm font-semibold text-ink-900">
										{canManageUsers ? (
											<Link prefetch="intent" to={`/admin/users/${account.id}`} className="hover:text-brand-700 hover:underline">
												{account.name}
											</Link>
										) : (
											account.name
										)}
									</p>
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
