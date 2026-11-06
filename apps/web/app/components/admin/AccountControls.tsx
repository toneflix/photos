import { Form, useSubmit } from "react-router";
import type { AdminUser, Role } from "@photos/types";
import { Button, Select } from "~/components/ui";

/** Change an account's role, or suspend it and let it back in. Posts to the page it is on. */
export function AccountControls({ account, roles, isMe, busy }: { account: AdminUser; roles: Role[]; isMe: boolean; busy: boolean }) {
	const submit = useSubmit();

	return (
		<div className="flex items-center gap-2">
			<Form method="post" onChange={(event) => submit(event.currentTarget, { preventScrollReset: true })}>
				<input type="hidden" name="intent" value="role" />
				<input type="hidden" name="id" value={account.id} />
				<Select name="role" defaultValue={account.role} disabled={isMe || busy} aria-label={`Role for ${account.name}`} className="w-auto !py-2 text-sm">
					{roles.map((role) => (
						<option key={role.slug} value={role.slug}>
							{role.name}
						</option>
					))}
				</Select>
			</Form>
			<Form
				method="post"
				preventScrollReset
				onSubmit={(event) => {
					if (!account.suspended && !confirm(`Suspend ${account.name}? They are signed out everywhere and can't sign in until you let them back in.`)) event.preventDefault();
				}}
			>
				<input type="hidden" name="intent" value="suspend" />
				<input type="hidden" name="id" value={account.id} />
				<input type="hidden" name="suspended" value={String(!account.suspended)} />
				<Button type="submit" variant={account.suspended ? "secondary" : "danger"} disabled={isMe || busy} className="!py-2">
					{account.suspended ? "Let back in" : "Suspend"}
				</Button>
			</Form>
		</div>
	);
}
