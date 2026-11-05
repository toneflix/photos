import { Link } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { optionalUser } from "~/lib/session.server";
import { buttonClass } from "~/components/ui";
import { AuthFrame } from "~/components/AuthFrame";
import type { Route } from "./+types/verify-email";

export const meta = () => [{ title: "Confirm your email · Toneflix Photos" }];

/** Confirms the address as soon as the emailed link is opened. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const params = new URL(request.url).searchParams;
	const signedIn = !!(await optionalUser(request, context));

	try {
		const { data: user } = await (await getServerApi(request, env, null)).auth.verifyEmail({
			token: params.get("token") ?? "",
			email: params.get("email") ?? "",
		});

		return { verified: true, email: user.email, error: null, signedIn };
	} catch (error) {
		return { verified: false, email: params.get("email"), error: formError(error).error, signedIn };
	}
}

export default function VerifyEmail({ loaderData }: Route.ComponentProps) {
	const { verified, email, error, signedIn } = loaderData;
	const next = signedIn ? { to: "/books", label: "Go to your books" } : { to: "/signin", label: "Sign in" };

	return (
		<AuthFrame
			title={verified ? "Email confirmed" : "We couldn't confirm it"}
			subtitle={verified ? `${email} is confirmed. Thanks for keeping your account safe.` : error}
		>
			{!verified && (
				<p className="mb-6 text-sm text-ink-500">
					Links work for 24 hours and only for the address they were sent to. You can send a new one from{" "}
					<Link to="/settings/email" className="font-medium text-brand-700 hover:underline">
						your settings
					</Link>
					.
				</p>
			)}
			<Link to={next.to} className={buttonClass("primary", "w-full py-3")}>
				{next.label}
			</Link>
		</AuthFrame>
	);
}
