import { Form, useNavigation } from "react-router";
import { requireSignIn, requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { useToastMessage } from "~/lib/toast";
import { Alert, Button, Field, Input } from "~/components/ui";
import { PageHeader, Section, resultFor } from "~/components/settings/Section";
import type { Route } from "./+types/email";

export const meta = () => [{ title: "Email · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireUser(request, context);

	return { user };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();

	if (form.get("intent") === "verify") {
		return settingsAction("verify", async () => {
			await api.account.sendVerification();

			return { message: "Sent. Open the link in the email to confirm." };
		});
	}

	return settingsAction("email", async () => {
		const { data: user } = await api.account.updateEmail({
			email: String(form.get("email") ?? ""),
			password: String(form.get("password") ?? ""),
		});

		return { message: `Email changed. We sent a confirmation link to ${user.email}.` };
	});
}

export default function Email({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { user } = loaderData;
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const verify = resultFor(actionData, "verify");
	const change = resultFor(actionData, "email");

	return (
		<>
			<PageHeader title="Email" description="You sign in with this address, and it's where we send security emails." />
			<div className="space-y-6">
				<Section>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="min-w-0">
							<p className="truncate font-medium text-ink-900">{user.email}</p>
							{user.emailVerified ? (
								<p className="mt-1 text-sm text-emerald-700">Confirmed</p>
							) : (
								<p className="mt-1 text-sm text-amber-700">Not confirmed yet. Check your inbox for our email.</p>
							)}
						</div>
						{!user.emailVerified && (
							<Form method="post">
								<Button variant="secondary" type="submit" name="intent" value="verify" disabled={busy("verify")}>
									{busy("verify") ? "Sending…" : "Send the link again"}
								</Button>
							</Form>
						)}
					</div>
					{verify?.error && (
						<div className="mt-4">
							<Alert>{verify.error}</Alert>
						</div>
					)}
				</Section>

				<Section title="Use a different address" description="We'll tell your old address, and ask you to confirm the new one.">
					<Form method="post" className="max-w-md space-y-4">
						<input type="hidden" name="intent" value="email" />
						<Field label="New email" error={change?.fieldErrors.email}>
							<Input name="email" type="email" autoComplete="email" required />
						</Field>
						<Field label="Your password" error={change?.fieldErrors.password}>
							<Input name="password" type="password" autoComplete="current-password" required />
						</Field>
						<Button type="submit" disabled={busy("email")}>
							{busy("email") ? "Changing…" : "Change email"}
						</Button>
					</Form>
				</Section>
			</div>
		</>
	);
}
