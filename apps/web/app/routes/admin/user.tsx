import { useNavigation } from "react-router";
import { AccountControls, PlanControl } from "~/components/admin/AccountControls";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Avatar } from "~/components/Avatar";
import { TopList } from "~/components/stats/TopList";
import { RANGES, RangePicker, StatTiles, StatsChart } from "~/components/stats/StatsChart";
import { Alert } from "~/components/ui";
import { requireAdmin, updateAccount } from "~/lib/admin.server";
import type { Route } from "./+types/user";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.account.name ?? "Account"} · Admin · Toneflix Photos` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "users.view", "users.manage");
	const days = RANGES.find((range) => range === Number(new URL(request.url).searchParams.get("days"))) ?? 30;
	const canManage = user.permissions.includes("users.manage");
	const canManagePlans = user.permissions.includes("plans.manage");
	const [account, roles, plans] = await Promise.all([api.admin.user(params.id, days), api.admin.roles(), canManagePlans ? api.admin.plans() : null]);

	return {
		account: account.data,
		roles: roles.data,
		plans: plans?.data ?? null,
		days,
		isMe: user.id === params.id,
		canManage,
		canModerate: user.permissions.includes("content.moderate"),
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "users.manage", "plans.manage");

	return updateAccount(api, await request.formData());
}

const number = new Intl.NumberFormat("en");

export default function AdminUserPage({ loaderData, actionData }: Route.ComponentProps) {
	const { account, roles, plans, days, isMe, canManage, canModerate } = loaderData;
	const navigation = useNavigation();
	const role = roles.find((entry) => entry.slug === account.role)?.name ?? account.role;

	return (
		<>
			<AdminHeader
				title={account.name}
				description={`${account.email}${account.emailVerified ? "" : " (unconfirmed)"} · ${role} · joined ${new Date(account.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
				back={{ to: "/admin/users", label: "All users" }}
			>
				{canManage && <AccountControls account={account} roles={roles} isMe={isMe} busy={navigation.state !== "idle"} />}
			</AdminHeader>
			<div className="space-y-6 px-4 py-8 sm:px-8">
				{actionData?.error && <Alert>{actionData.error}</Alert>}

				<div className="flex items-center gap-3">
					<Avatar user={account} />
					<p className="text-sm text-ink-500">
						{account.suspended ? "Suspended. " : ""}
						{account.showCounts ? "Shows view and download counts on their public work." : "Keeps view and download counts to themselves."}
					</p>
				</div>

				<div className="panel flex flex-wrap items-end justify-between gap-4 p-5">
					<div>
						<p className="text-xs font-semibold tracking-[0.14em] text-ink-500 uppercase">Plan</p>
						<p className="mt-1 font-display text-xl font-bold text-ink-900">{account.plan.name}</p>
						<p className="text-sm text-ink-500">
							{account.plan.endsAt ? `Until ${new Date(account.plan.endsAt).toLocaleDateString(undefined, { dateStyle: "medium" })}` : "No paid time"}
						</p>
					</div>
					{plans && <PlanControl key={account.plan.slug + account.plan.endsAt} account={account} plans={plans} busy={navigation.state !== "idle"} />}
				</div>

				<StatTiles
					items={[
						{ label: "Views", value: number.format(account.totals.views), note: "All their public work, all time" },
						{ label: "Downloads", value: number.format(account.totals.downloads), note: "Photos and books" },
						{ label: "Photos", value: number.format(account.photoCount), note: `${number.format(account.publicPhotoCount)} on Explore` },
						{ label: "Books", value: number.format(account.bookCount), note: `${number.format(account.publicBookCount)} public` },
						{ label: "Spaces", value: number.format(account.spaceCount) },
					]}
				/>

				<div className="space-y-3">
					<RangePicker days={days} />
					<StatsChart days={account.daily} title={`Their work over the last ${days} days`} />
				</div>

				<div className="grid gap-6 lg:grid-cols-2">
					<TopList title="Most viewed photos" items={account.topPhotos} href={canModerate ? (item) => `/admin/photos/${item.id}` : undefined} />
					<TopList title="Most viewed books" items={account.topBooks} href={canModerate ? (item) => `/admin/books/${item.id}` : undefined} />
				</div>
			</div>
		</>
	);
}
