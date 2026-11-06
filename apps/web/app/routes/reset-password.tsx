import { data, Form, Link, redirect, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { Alert, Button, Field, Input } from "~/components/ui";
import { AuthFrame } from "~/components/AuthFrame";
import type { Route } from "./+types/reset-password";

export const meta = () => [{ title: "Choose a new password · Toneflix Photos" }];

export function loader({ request }: Route.LoaderArgs) {
	return { token: new URL(request.url).searchParams.get("token") ?? "" };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const form = await request.formData();

	try {
		await (await getServerApi(request, env, null)).auth.resetPassword({
			token: String(form.get("token") ?? ""),
			password: String(form.get("password") ?? ""),
			password_confirmation: String(form.get("password_confirmation") ?? ""),
		});

		return redirect("/signin?reset=1");
	} catch (error) {
		const result = formError(error);

		return data(result, { status: result.status === 503 ? 503 : 422 });
	}
}

export default function ResetPassword({ loaderData, actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";
	const subtitle = (
		<>
			Need a new link?{" "}
			<Link prefetch="intent" to="/forgot-password" className="font-medium text-brand-700 hover:underline">
				Send another
			</Link>
		</>
	);

	if (!loaderData.token) {
		return (
			<AuthFrame title="This link is incomplete" subtitle={subtitle}>
				<p className="text-sm text-ink-500">Open the reset link from your email again, or ask for a new one.</p>
			</AuthFrame>
		);
	}

	return (
		<AuthFrame title="Choose a new password" subtitle={subtitle}>
			<Form method="post" className="space-y-5">
				<input type="hidden" name="token" value={loaderData.token} />
				{actionData?.error && !Object.keys(actionData.fieldErrors).length && <Alert>{actionData.error}</Alert>}
				<Field label="New password" error={actionData?.fieldErrors.password} hint="At least 8 characters.">
					<Input name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
				</Field>
				<Field label="Type it again">
					<Input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required />
				</Field>
				<p className="text-xs text-ink-500">Every device signed in to your account will be signed out.</p>
				<Button type="submit" className="w-full py-3" disabled={busy}>
					{busy ? "Saving…" : "Save new password"}
				</Button>
			</Form>
		</AuthFrame>
	);
}
