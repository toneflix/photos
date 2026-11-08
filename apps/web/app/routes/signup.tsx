import { data, Form, Link, redirect, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { commitToken, optionalUser, safeRedirect } from "~/lib/session.server";
import { Alert, Button, Field, Input } from "~/components/ui";
import { AuthFrame } from "~/components/AuthFrame";
import { useLimits } from "~/lib/limits";
import type { Route } from "./+types/signup";

export const meta = () => [{ title: "Create an account · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const next = new URL(request.url).searchParams.get("next");

	if (await optionalUser(request, context)) throw redirect(safeRedirect(next));
	return { next: next ? safeRedirect(next) : null };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const form = await request.formData();
	const name = String(form.get("name") ?? "");
	const email = String(form.get("email") ?? "");
	const password = String(form.get("password") ?? "");

	try {
		const api = await getServerApi(request, env, null);
		const { data: session } = await api.auth.register({ name, email, password });
		return redirect(safeRedirect(form.get("next"), "/photos?welcome=1"), {
			headers: { "Set-Cookie": await commitToken(request, session.token) },
		});
	} catch (error) {
		const result = formError(error);
		return data({ ...result, name, email }, { status: result.status === 503 ? 503 : 422 });
	}
}

export default function SignUp({ loaderData, actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";
	const { registrationOpen } = useLimits();

	return (
		<AuthFrame
			title="Start your first book"
			subtitle={
				<>
					Already have an account?{" "}
					<Link
						prefetch="intent"
						to={loaderData?.next ? `/signin?next=${encodeURIComponent(loaderData.next)}` : "/signin"}
						className="font-medium text-brand-700 hover:underline"
					>
						Sign in
					</Link>
				</>
			}
		>
			{!registrationOpen && <Alert>Sign-ups are closed right now. If you already have an account, sign in instead.</Alert>}
			<Form method="post" className={`space-y-5 ${registrationOpen ? "" : "hidden"}`}>
				{loaderData?.next && <input type="hidden" name="next" value={loaderData.next} />}
				{actionData?.error && !Object.keys(actionData.fieldErrors).length && <Alert>{actionData.error}</Alert>}
				<Field label="Your name" error={actionData?.fieldErrors.name}>
					<Input name="name" autoComplete="name" required defaultValue={actionData?.name} autoFocus />
				</Field>
				<Field label="Email" error={actionData?.fieldErrors.email}>
					<Input name="email" type="email" autoComplete="email" required defaultValue={actionData?.email} />
				</Field>
				<Field label="Password" error={actionData?.fieldErrors.password} hint="At least 8 characters.">
					<Input name="password" type="password" autoComplete="new-password" minLength={8} required />
				</Field>
				<Button type="submit" className="w-full py-3" disabled={busy}>
					{busy ? "Creating your account…" : "Create account"}
				</Button>
				<p className="text-center text-sm text-ink-500">
					By creating an account you agree to the{" "}
					<Link prefetch="intent" to="/terms" className="font-medium text-brand-700 hover:underline">
						terms of use
					</Link>{" "}
					and{" "}
					<Link prefetch="intent" to="/privacy" className="font-medium text-brand-700 hover:underline">
						privacy policy
					</Link>
					.
				</p>
			</Form>
		</AuthFrame>
	);
}
