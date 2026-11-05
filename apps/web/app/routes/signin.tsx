import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { commitToken, optionalUser, safeRedirect } from "~/lib/session.server";
import { Alert, Button, Field, Input, Notice, OtpInput } from "~/components/ui";
import { AuthFrame } from "~/components/AuthFrame";
import type { Route } from "./+types/signin";

export const meta = () => [{ title: "Sign in · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const params = new URL(request.url).searchParams;
	const next = safeRedirect(params.get("next"));

	if (await optionalUser(request, context)) throw redirect(next);

	return { next, notice: params.get("reset") ? "Your password was changed. Sign in with the new one." : null };
}

/** Signs in with email and password, then with a two-step code when the account asks for one. */
export async function action({ request, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const form = await request.formData();
	const email = String(form.get("email") ?? "");
	const challengeToken = String(form.get("challengeToken") ?? "");
	const next = safeRedirect(form.get("next"));

	try {
		const api = await getServerApi(request, env, null);

		const { data: result } = challengeToken
			? await api.auth.twoFactor({
					challengeToken,
					code: String(form.get("code") ?? "") || undefined,
					recoveryCode: String(form.get("recoveryCode") ?? "") || undefined,
				})
			: await api.auth.login({ email, password: String(form.get("password") ?? "") });

		if (result.twoFactor) return { challengeToken: result.challengeToken, email, error: null, fieldErrors: {} as Record<string, string> };

		return redirect(next, { headers: { "Set-Cookie": await commitToken(request, result.token) } });
	} catch (error) {
		const result = formError(error);

		return data({ ...result, email, challengeToken: challengeToken || null }, { status: result.status === 503 ? 503 : 422 });
	}
}

export default function SignIn({ loaderData, actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";

	if (actionData?.challengeToken) {
		return <TwoStepForm next={loaderData.next} challengeToken={actionData.challengeToken} error={actionData.error} busy={busy} />;
	}

	return (
		<AuthFrame
			title="Welcome back"
			subtitle={
				<>
					New here?{" "}
					<Link to="/signup" className="font-medium text-brand-700 hover:underline">
						Create an account
					</Link>
				</>
			}
		>
			<Form method="post" className="space-y-5">
				<input type="hidden" name="next" value={loaderData.next} />
				{loaderData.notice && !actionData && <Notice>{loaderData.notice}</Notice>}
				{actionData?.error && !Object.keys(actionData.fieldErrors).length && <Alert>{actionData.error}</Alert>}
				<Field label="Email" error={actionData?.fieldErrors.email}>
					<Input name="email" type="email" autoComplete="email" required defaultValue={actionData?.email} autoFocus />
				</Field>
				<Field label="Password" error={actionData?.fieldErrors.password}>
					<Input name="password" type="password" autoComplete="current-password" required />
				</Field>
				<div className="-mt-2 text-right">
					<Link to="/forgot-password" className="text-sm text-ink-500 hover:text-brand-700 hover:underline">
						Forgot your password?
					</Link>
				</div>
				<Button type="submit" className="w-full py-3" disabled={busy}>
					{busy ? "Signing in…" : "Sign in"}
				</Button>
			</Form>
		</AuthFrame>
	);
}

function TwoStepForm({
	next,
	challengeToken,
	error,
	busy,
}: {
	next: string;
	challengeToken: string;
	error: string | null;
	busy: boolean;
}) {
	const [recovery, setRecovery] = useState(false);

	return (
		<AuthFrame
			title="Two-step sign-in"
			subtitle={
				recovery
					? "Enter one of the recovery codes you saved when you turned on two-step sign-in."
					: "Open your authenticator app and enter the 6-digit code for Toneflix Photos."
			}
		>
			<Form method="post" className="space-y-5">
				<input type="hidden" name="next" value={next} />
				<input type="hidden" name="challengeToken" value={challengeToken} />
				{error && <Alert>{error}</Alert>}
				{recovery ? (
					<Field label="Recovery code">
						<Input key="recovery" name="recoveryCode" autoComplete="off" placeholder="XXXX-XXXX" required autoFocus />
					</Field>
				) : (
					<Field label="Code">
						<OtpInput key="code" name="code" invalid={!!error} disabled={busy} autoFocus />
					</Field>
				)}
				<Button type="submit" className="w-full py-3" disabled={busy}>
					{busy ? "Checking…" : "Continue"}
				</Button>
				<button
					type="button"
					onClick={() => setRecovery(!recovery)}
					className="block w-full text-center text-sm text-ink-500 hover:text-brand-700 hover:underline"
				>
					{recovery ? "Use your authenticator app instead" : "Can't use your app? Use a recovery code"}
				</button>
			</Form>
		</AuthFrame>
	);
}
