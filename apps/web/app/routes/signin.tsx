import { data, Form, Link, redirect, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { commitToken, optionalUser, safeRedirect } from "~/lib/session.server";
import { Alert, Button, Field, Input } from "~/components/ui";
import { AuthFrame } from "~/components/AuthFrame";
import type { Route } from "./+types/signin";

export const meta = () => [{ title: "Sign in · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const next = safeRedirect(new URL(request.url).searchParams.get("next"));
	if (await optionalUser(request, context)) throw redirect(next);
	return { next };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const form = await request.formData();
	const email = String(form.get("email") ?? "");
	const password = String(form.get("password") ?? "");

	try {
		const api = await getServerApi(request, env, null);
		const { data: session } = await api.auth.login({ email, password });
		return redirect(safeRedirect(form.get("next")), {
			headers: { "Set-Cookie": await commitToken(request, session.token) },
		});
	} catch (error) {
		const result = formError(error);
		return data({ ...result, email }, { status: result.status === 503 ? 503 : 422 });
	}
}

export default function SignIn({ loaderData, actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";

	return (
		<AuthFrame
			title="Welcome back"
			subtitle={
				<>
					New here?{" "}
					<Link to="/signup" className="font-medium text-ember-600 hover:underline">
						Create an account
					</Link>
				</>
			}
		>
			<Form method="post" className="space-y-5">
				<input type="hidden" name="next" value={loaderData.next} />
				{actionData?.error && !Object.keys(actionData.fieldErrors).length && <Alert>{actionData.error}</Alert>}
				<Field label="Email" error={actionData?.fieldErrors.email}>
					<Input name="email" type="email" autoComplete="email" required defaultValue={actionData?.email} autoFocus />
				</Field>
				<Field label="Password" error={actionData?.fieldErrors.password}>
					<Input name="password" type="password" autoComplete="current-password" required />
				</Field>
				<Button type="submit" className="w-full py-3" disabled={busy}>
					{busy ? "Signing in…" : "Sign in"}
				</Button>
			</Form>
		</AuthFrame>
	);
}
