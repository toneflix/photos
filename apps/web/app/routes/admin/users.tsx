import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { AccountControls } from "~/components/admin/AccountControls";
import type { AdminUser, Role, UserRole } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Avatar } from "~/components/Avatar";
import { Alert, Button, Input, Select, buttonClass } from "~/components/ui";
import { Icon } from "~/components/admin/Icon";
import { requireAdmin, updateAccount } from "~/lib/admin.server";
import type { Route } from "./+types/users";

export const meta = () => [{ title: "Users · Admin · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "users.view", "users.manage");
	const params = new URL(request.url).searchParams;
	const role = params.get("role") as UserRole | null;
	const status = params.get("status") as "active" | "suspended" | null;
	const [result, roles] = await Promise.all([
		api.admin.users({
		q: params.get("q") || undefined,
		role: role || undefined,
		status: status || undefined,
			page: Number(params.get("page")) || 1,
		}),
		api.admin.roles(),
	]);

	return { users: result.data, meta: result.meta, roles: roles.data, me: user.id, canManage: user.permissions.includes("users.manage") };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "users.manage");

	return updateAccount(api, await request.formData());
}

export default function AdminUsers({ loaderData, actionData }: Route.ComponentProps) {
	const { users, meta, roles, me, canManage } = loaderData;
	const [params] = useSearchParams();
	const pageLink = (page: number) => {
		const next = new URLSearchParams(params);

		next.set("page", String(page));

		return `?${next}`;
	};

	return (
		<>
			<AdminHeader title="Users" description="Find accounts, give people a role and suspend accounts that break the rules." />
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<Form method="get" className="flex flex-wrap items-center gap-3">
					<Input
						addon={<Icon name="search" className="h-4 w-4" />}
						type="search"
						name="q"
						defaultValue={params.get("q") ?? ""}
						placeholder="Name or email"
						aria-label="Search accounts"
						className="sm:max-w-sm"
					/>
					<Select name="role" defaultValue={params.get("role") ?? ""} aria-label="Role" className="w-auto">
						<option value="">Every role</option>
						{roles.map((role) => (
							<option key={role.slug} value={role.slug}>
								{role.name}
							</option>
						))}
					</Select>
					<Select name="status" defaultValue={params.get("status") ?? ""} aria-label="Status" className="w-auto">
						<option value="">Active and suspended</option>
						<option value="active">Active</option>
						<option value="suspended">Suspended</option>
					</Select>
					<Button type="submit" variant="brand">
						Search
					</Button>
				</Form>

				{actionData?.error && <Alert>{actionData.error}</Alert>}

				<div className="panel overflow-hidden">
					{users.length === 0 ? (
						<p className="px-5 py-10 text-center text-ink-500">No accounts match.</p>
					) : (
						<ul className="divide-y divide-surface-200">
							{users.map((account) => (
								<UserRow key={account.id} account={account} roles={roles} isMe={account.id === me} canManage={canManage} />
							))}
						</ul>
					)}
				</div>

				{meta.last_page > 1 && (
					<nav className="flex items-center justify-between text-sm text-ink-500" aria-label="Pages">
						<span>
							Page {meta.current_page} of {meta.last_page} · {meta.total} accounts
						</span>
						<div className="flex gap-2">
							{meta.current_page > 1 && (
								<Link to={pageLink(meta.current_page - 1)} className={buttonClass("secondary")}>
									Previous
								</Link>
							)}
							{meta.current_page < meta.last_page && (
								<Link to={pageLink(meta.current_page + 1)} className={buttonClass("secondary")}>
									Next
								</Link>
							)}
						</div>
					</nav>
				)}
			</div>
		</>
	);
}

function UserRow({ account, roles, isMe, canManage }: { account: AdminUser; roles: Role[]; isMe: boolean; canManage: boolean }) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle" && navigation.formData?.get("id") === account.id;

	return (
		<li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
			<Avatar user={account} />
			<div className="min-w-0 flex-1 basis-56">
				<p className="flex items-center gap-2 truncate text-sm font-semibold text-ink-900">
					<Link prefetch="intent" to={`/admin/users/${account.id}`} className="truncate hover:text-brand-700 hover:underline">
						{account.name}
					</Link>
					{isMe && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">You</span>}
					{account.suspended && <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">Suspended</span>}
				</p>
				<p className="truncate text-sm text-ink-500">
					{account.email}
					{!account.emailVerified && " · unconfirmed"}
				</p>
			</div>
			<p className="text-sm text-ink-500">
				{account.photoCount} {account.photoCount === 1 ? "photo" : "photos"} · {account.bookCount} {account.bookCount === 1 ? "book" : "books"} · joined {new Date(account.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
			</p>
			{canManage ? (
				<AccountControls account={account} roles={roles} isMe={isMe} busy={busy} />
			) : (
				<span className="rounded-md bg-surface-100 px-2 py-1 text-sm font-medium text-ink-700">{roles.find((role) => role.slug === account.role)?.name ?? account.role}</span>
			)}
		</li>
	);
}
