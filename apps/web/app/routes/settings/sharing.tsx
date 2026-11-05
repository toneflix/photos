import { Form, useNavigation } from "react-router";
import type { Visibility } from "@photos/types";
import { requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Button, Notice } from "~/components/ui";
import { PageHeader, Section, resultFor } from "~/components/settings/Section";
import type { Route } from "./+types/sharing";

export const meta = () => [{ title: "Sharing · Settings · Toneflix Photos" }];

const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
	{ value: "private", label: "Only me", hint: "Nobody else can open new books until you share them." },
	{ value: "shared", label: "Anyone with the link", hint: "New books open for people you send the link to." },
	{ value: "public", label: "Public", hint: "New books are open to everyone with the link, and can be listed later." },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireUser(request, context);

	return { user };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();

	if (form.get("intent") === "lock-books") {
		return settingsAction("lock-books", async () => {
			const { data } = await api.account.lockBooks();

			return {
				message: data.updated
					? `${data.updated} ${data.updated === 1 ? "book is" : "books are"} private now.`
					: "All your books were already private.",
			};
		});
	}

	return settingsAction("privacy", async () => {
		await api.account.updatePrivacy({
			defaultVisibility: String(form.get("defaultVisibility")) as Visibility,
			showOwnerName: form.get("showOwnerName") === "on",
		});

		return { message: "Saved." };
	});
}

export default function Sharing({ loaderData, actionData }: Route.ComponentProps) {
	const { user } = loaderData;
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const privacy = resultFor(actionData, "privacy");
	const lock = resultFor(actionData, "lock-books");

	return (
		<>
			<PageHeader title="Sharing" description="Who can open your books. Each book also has its own setting in the editor; these are the starting point." />
			<div className="space-y-6">
				<Section>
					<Form method="post" className="space-y-6">
						<input type="hidden" name="intent" value="privacy" />
						<fieldset>
							<legend className="mb-3 text-sm font-medium text-ink-700">Who can open a new book</legend>
							<div className="grid gap-3 sm:grid-cols-3">
								{VISIBILITY.map((option) => (
									<label
										key={option.value}
										className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-paper-300 p-4 transition has-[:checked]:border-ink-900 has-[:checked]:bg-paper-100"
									>
										<span className="flex items-center gap-2 text-sm font-medium text-ink-900">
											<input
												type="radio"
												name="defaultVisibility"
												value={option.value}
												defaultChecked={user.defaultVisibility === option.value}
												className="accent-ink-900"
											/>
											{option.label}
										</span>
										<span className="text-xs text-ink-500">{option.hint}</span>
									</label>
								))}
							</div>
						</fieldset>
						<label className="flex cursor-pointer items-start gap-3">
							<input type="checkbox" name="showOwnerName" defaultChecked={user.showOwnerName} className="mt-1 h-4 w-4 accent-ink-900" />
							<span>
								<span className="block text-sm font-medium text-ink-900">Show my name on books I share</span>
								<span className="block text-xs text-ink-500">When off, people opening your books don't see who made them.</span>
							</span>
						</label>
						<div className="flex items-center gap-3">
							<Button type="submit" disabled={busy("privacy")}>
								{busy("privacy") ? "Saving…" : "Save"}
							</Button>
							{privacy?.message && <span className="text-sm text-emerald-700">{privacy.message}</span>}
						</div>
					</Form>
				</Section>

				<Section title="Stop sharing everything" description="Makes every book private at once. Shared links stop working.">
					<Form method="post">
						<Button variant="secondary" type="submit" name="intent" value="lock-books" disabled={busy("lock-books")}>
							Make all books private
						</Button>
					</Form>
					{lock?.message && (
						<div className="mt-4">
							<Notice>{lock.message}</Notice>
						</div>
					)}
				</Section>
			</div>
		</>
	);
}
