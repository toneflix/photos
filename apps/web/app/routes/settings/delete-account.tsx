import { Form, Link, redirect, useNavigation } from "react-router";
import { clearToken, requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Alert, Button, Field, Input } from "~/components/ui";
import { PageHeader, Section } from "~/components/settings/Section";
import type { Route } from "./+types/delete-account";

export const meta = () => [{ title: "Delete account · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	await requireUser(request, context);

	return null;
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const password = String((await request.formData()).get("password") ?? "");

	const result = await settingsAction("delete-account", async () => {
		await api.account.remove({ password });

		return { message: "" };
	});

	if ("error" in result && result.error === null) {
		throw redirect("/?deleted=1", { headers: { "Set-Cookie": await clearToken(request) } });
	}

	return result;
}

export default function DeleteAccount({ actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";

	return (
		<>
			<PageHeader title="Delete account" />
			<Section tone="danger">
				<p className="text-ink-700">This deletes your account, every book and every photo for good. Links you've shared stop working.</p>
				<p className="mt-2 text-sm text-ink-500">
					Want to keep them?{" "}
					<Link to="/settings/data" className="font-medium text-brand-700 hover:underline">
						Download your data
					</Link>{" "}
					first.
				</p>
				<Form method="post" className="mt-6 max-w-md space-y-4">
					{actionData?.error && !Object.keys(actionData.fieldErrors).length && <Alert>{actionData.error}</Alert>}
					<Field label="Enter your password to confirm" error={actionData?.fieldErrors.password}>
						<Input name="password" type="password" autoComplete="current-password" required />
					</Field>
					<Button variant="danger" type="submit" disabled={busy} className="!bg-red-700 !text-white hover:!bg-red-800">
						{busy ? "Deleting…" : "Delete everything"}
					</Button>
				</Form>
			</Section>
		</>
	);
}
