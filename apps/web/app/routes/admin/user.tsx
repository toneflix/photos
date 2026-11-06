import { useNavigation } from "react-router";
import { AccountControls } from "~/components/admin/AccountControls";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Avatar } from "~/components/Avatar";
import { TopList } from "~/components/admin/ContentParts";
import { RANGES, RangePicker, StatTiles, StatsChart } from "~/components/admin/StatsChart";
import { Alert } from "~/components/ui";
import { requireAdmin, updateAccount } from "~/lib/admin.server";
import type { Route } from "./+types/user";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.account.name ?? "Account"} · Admin · Toneflix Photos` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "users.view", "users.manage");
	const days = RANGES.find((range) => range === Number(new URL(request.url).searchParams.get("days"))) ?? 30;
	const canManage = user.permissions.includes("users.manage");
	const [account, roles] = await Promise.all([api.admin.user(params.id, days), api.admin.roles()]);

	return {
		account: account.data,
		roles: roles.data,
		days,
		isMe: user.id === params.id,
		canManage,
		canModerate: user.permissions.includes("content.moderate"),
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "users.manage");

	return updateAccount(api, await request.formData());
}

const number = new Intl.NumberFormat("en");

export default function AdminUserPage({ loaderData, actionData }: Route.ComponentProps) {
	const { account, roles, days, isMe, canManage, canModerate } = loaderData;
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
					<TopList title="Most viewed photos" items={account.topPhotos} kind="photos" linked={canModerate} />
					<TopList title="Most viewed books" items={account.topBooks} kind="books" linked={canModerate} />
				</div>
			</div>
		</>
	);
}
