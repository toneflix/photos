import { Form, useSubmit } from "react-router";
import type { AdminPlan, AdminUserDetail, AdminUser, Role } from "@photos/types";
import { useState } from "react";
import { Button, Select } from "~/components/ui";
import { periodLabel } from "~/lib/plans";

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

/** Put an account on a plan without payment, for a number of periods. The default plan ends any paid time. */
export function PlanControl({ account, plans, busy }: { account: AdminUserDetail; plans: AdminPlan[]; busy: boolean }) {
	const [plan, setPlan] = useState(account.plan.slug);
	const chosen = plans.find((entry) => entry.slug === plan);

	return (
		<Form method="post" preventScrollReset className="flex flex-wrap items-end gap-3">
			<input type="hidden" name="intent" value="plan" />
			<input type="hidden" name="id" value={account.id} />
			<label className="block">
				<span className="mb-1.5 block text-sm font-semibold text-ink-900">Plan</span>
				<Select name="plan" value={plan} onChange={(event) => setPlan(event.target.value)} disabled={busy} className="w-auto !py-2 text-sm">
					{plans
						.filter((entry) => entry.active || entry.slug === account.plan.slug)
						.map((entry) => (
							<option key={entry.slug} value={entry.slug}>
								{entry.name}
								{entry.isHidden ? " (hidden)" : ""}
							</option>
						))}
				</Select>
			</label>
			{chosen && !chosen.isDefault && (
				<label className="block">
					<span className="mb-1.5 block text-sm font-semibold text-ink-900">For</span>
					<Select name="cycles" defaultValue="1" disabled={busy} className="w-auto !py-2 text-sm">
						{[1, 3, 6, 12, 24].map((cycles) => (
							<option key={cycles} value={cycles}>
								{periodLabel(chosen, cycles)}
							</option>
						))}
					</Select>
				</label>
			)}
			<Button type="submit" variant="secondary" disabled={busy} className="!py-2">
				{chosen?.isDefault ? "Move to this plan" : "Give this plan"}
			</Button>
		</Form>
	);
}
