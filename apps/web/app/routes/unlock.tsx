import { data, Form, Link, redirect, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { BookCodes } from "~/lib/book-codes.server";
import { Alert, Button, Field, Input } from "~/components/ui";
import { AuthFrame } from "~/components/AuthFrame";
import type { Route } from "./+types/unlock";

export const meta = () => [{ title: "Open a book with a code · Toneflix Photos" }];

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const code = String((await request.formData()).get("code") ?? "");

	try {
		const { data: grant } = await (await getServerApi(request, env)).accessCodes.redeem(code);
		const codes = await BookCodes.from(request);

		return redirect(`/books/${grant.book.id}`, { headers: { "Set-Cookie": await codes.remember(grant.book.id, grant.code) } });
	} catch (error) {
		const result = formError(error);

		return data({ error: result.error, code }, { status: result.status === 503 ? 503 : 422 });
	}
}

export default function Unlock({ actionData }: Route.ComponentProps) {
	const busy = useNavigation().state !== "idle";

	return (
		<AuthFrame
			title="Open a book with a code"
			subtitle={
				<>
					Someone shared a private photo book with you? Enter the code they gave you.{" "}
					<Link prefetch="intent" to="/explore/books" className="font-medium text-brand-700 hover:underline">
						Or browse public books
					</Link>
				</>
			}
		>
			<Form method="post" className="space-y-5">
				{actionData?.error && <Alert>{actionData.error}</Alert>}
				<Field label="Access code" hint="Like K7QM-4XTP. Capitals and the dash don't matter.">
					<Input
						name="code"
						required
						autoFocus
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						defaultValue={actionData?.code}
						className="font-mono tracking-widest uppercase"
					/>
				</Field>
				<Button type="submit" className="w-full py-3" disabled={busy}>
					{busy ? "Opening…" : "Open book"}
				</Button>
			</Form>
		</AuthFrame>
	);
}
