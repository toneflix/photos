import { data, Form, Link, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { Alert, Button, Field, Input, Notice } from "~/components/ui";
import { AuthFrame } from "~/components/AuthFrame";
import type { Route } from "./+types/forgot-password";

export const meta = () => [{ title: "Forgot your password · Toneflix Photos" }];

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const email = String((await request.formData()).get("email") ?? "");

	try {
		const { message } = await (await getServerApi(request, env, null)).auth.forgotPassword({ email });

		return { sent: message, email, error: null, fieldErrors: {} as Record<string, string> };
	} catch (error) {
		const result = formError(error);

		return data({ ...result, sent: null, email }, { status: result.status === 503 ? 503 : 422 });
	}
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";

	return (
		<AuthFrame
			title="Forgot your password?"
			subtitle={
				<>
					Remembered it?{" "}
					<Link to="/signin" className="font-medium text-ember-600 hover:underline">
						Sign in
					</Link>
				</>
			}
		>
			{actionData?.sent ? (
				<div className="space-y-5">
					<Notice>{actionData.sent}</Notice>
					<p className="text-sm text-ink-500">
						Check <strong className="text-ink-700">{actionData.email}</strong>. The link works for an hour. Not there? Look in spam, or
						try again in a minute.
					</p>
				</div>
			) : (
				<Form method="post" className="space-y-5">
					{actionData?.error && !Object.keys(actionData.fieldErrors).length && <Alert>{actionData.error}</Alert>}
					<p className="text-sm text-ink-500">Enter the email you signed up with and we'll send you a link to choose a new password.</p>
					<Field label="Email" error={actionData?.fieldErrors.email}>
						<Input name="email" type="email" autoComplete="email" required defaultValue={actionData?.email} autoFocus />
					</Field>
					<Button type="submit" className="w-full py-3" disabled={busy}>
						{busy ? "Sending…" : "Send reset link"}
					</Button>
				</Form>
			)}
		</AuthFrame>
	);
}
