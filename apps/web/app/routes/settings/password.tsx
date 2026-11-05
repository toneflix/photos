import { Form, useNavigation } from "react-router";
import { requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Button, Field, Input, Notice } from "~/components/ui";
import { PageHeader, Section } from "~/components/settings/Section";
import type { Route } from "./+types/password";

export const meta = () => [{ title: "Password · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	await requireUser(request, context);

	return null;
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();

	return settingsAction("password", async () => {
		await api.account.updatePassword({
			currentPassword: String(form.get("currentPassword") ?? ""),
			password: String(form.get("password") ?? ""),
			password_confirmation: String(form.get("password_confirmation") ?? ""),
		});

		return { message: "Password changed. Your other devices were signed out." };
	});
}

export default function Password({ actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";

	return (
		<>
			<PageHeader title="Password" description="Changing it signs you out on every other device." />
			<Section>
				<Form method="post" className="max-w-md space-y-4" key={actionData?.message ?? "password"}>
					<Field label="Current password" error={actionData?.fieldErrors.currentPassword}>
						<Input name="currentPassword" type="password" autoComplete="current-password" required />
					</Field>
					<Field label="New password" error={actionData?.fieldErrors.password} hint="At least 8 characters.">
						<Input name="password" type="password" autoComplete="new-password" minLength={8} required />
					</Field>
					<Field label="Type it again">
						<Input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required />
					</Field>
					<Button type="submit" disabled={busy}>
						{busy ? "Saving…" : "Change password"}
					</Button>
					{actionData?.message && <Notice>{actionData.message}</Notice>}
				</Form>
			</Section>
		</>
	);
}
