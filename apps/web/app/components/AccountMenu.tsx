import { Form, Link } from "react-router";
import type { User } from "@photos/types";
import { Avatar } from "~/components/Avatar";

/** The avatar button and its menu. It closes on every navigation because it is keyed by the path. */
export function AccountMenu({ user }: { user: User }) {
	const item = "block rounded-md px-3 py-2 text-sm text-ink-700 hover:bg-surface-100 hover:text-ink-900";

	return (
		<details className="group relative">
			<summary className="cursor-pointer list-none rounded-full ring-brand-500/30 transition group-open:ring-4 hover:ring-4 [&::-webkit-details-marker]:hidden" aria-label="Account">
				<Avatar user={user} />
			</summary>
			<div className="absolute right-0 mt-2 w-60 panel rounded-xl p-2 !shadow-xl">
				<div className="px-3 py-2">
					<p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
					<p className="truncate text-xs text-ink-500">{user.email}</p>
				</div>
				<div className="my-1 border-t border-surface-200" />
				<Link prefetch="intent" to={`/makers/${user.username}`} className={item}>
					Your profile
				</Link>
				<Link prefetch="intent" to="/unlock" className={item}>
					Open a book with a code
				</Link>
				<Link prefetch="intent" to="/stats" className={item}>
					Your stats
				</Link>
				<Link prefetch="intent" to="/settings" className={item}>
					Settings
				</Link>
				<Link prefetch="intent" to="/settings/plan" className={item}>
					Your plan
				</Link>
				{user.permissions.length > 0 && (
					<Link prefetch="intent" to="/admin" className={item}>
						Admin
					</Link>
				)}
				<Link prefetch="intent" to="/settings/devices" className={item}>
					Devices
				</Link>
				<Link prefetch="intent" to="/settings/data" className={item}>
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
