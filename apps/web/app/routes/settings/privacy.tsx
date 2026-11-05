import { useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import type { Visibility } from "@photos/types";
import { requireUser, clearToken } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Alert, Button, Field, Input, Notice, buttonClass } from "~/components/ui";
import { Section, resultFor } from "~/components/settings/Section";
import type { Route } from "./+types/privacy";

export const meta = () => [{ title: "Privacy & data · Settings · Toneflix Photos" }];

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
	const intent = String(form.get("intent"));

	switch (intent) {
		case "lock-books":
			return settingsAction(intent, async () => {
				const { data } = await api.account.lockBooks();

				return { message: data.updated ? `${data.updated} ${data.updated === 1 ? "book is" : "books are"} private now.` : "All your books were already private." };
			});
		case "delete-account": {
			const result = await settingsAction(intent, async () => {
				await api.account.remove({ password: String(form.get("password") ?? "") });

				return { message: "" };
			});

			if ("error" in result && result.error === null) {
				throw redirect("/?deleted=1", { headers: { "Set-Cookie": await clearToken(request) } });
			}

			return result;
		}
		default:
			return settingsAction("privacy", async () => {
				await api.account.updatePrivacy({
					defaultVisibility: String(form.get("defaultVisibility")) as Visibility,
					showOwnerName: form.get("showOwnerName") === "on",
				});

				return { message: "Saved." };
			});
	}
}

export default function Privacy({ loaderData, actionData }: Route.ComponentProps) {
	const { user } = loaderData;
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const privacy = resultFor(actionData, "privacy");
	const lock = resultFor(actionData, "lock-books");
	const remove = resultFor(actionData, "delete-account");
	const [confirming, setConfirming] = useState(!!remove);

	return (
		<>
			<Section title="Sharing" description="Each book also has its own setting in the editor. These choices are the starting point.">
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

				<Form method="post" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-paper-200 pt-6">
					<div>
						<p className="text-sm font-medium text-ink-900">Stop sharing everything</p>
						<p className="text-xs text-ink-500">Makes every book private at once. Shared links stop working.</p>
					</div>
					<Button variant="secondary" type="submit" name="intent" value="lock-books" disabled={busy("lock-books")}>
						Make all books private
					</Button>
				</Form>
				{lock?.message && <div className="mt-4"><Notice>{lock.message}</Notice></div>}
			</Section>

			<Section title="Your data" description="A copy of everything you've kept here: every original photo, your books and their pages, and your account details.">
				<a href="/settings/export" download className={buttonClass("secondary")}>
					<IconDownload /> Download a zip
				</a>
			</Section>

			<Section
				title="Delete your account"
				tone="danger"
				description="This deletes your account, every book and every photo for good. Shared links stop working. Download your data first if you want to keep it."
			>
				{confirming ? (
					<Form method="post" className="max-w-md space-y-4">
						<input type="hidden" name="intent" value="delete-account" />
						{remove?.error && !Object.keys(remove.fieldErrors).length && <Alert>{remove.error}</Alert>}
						<Field label="Enter your password to confirm" error={remove?.fieldErrors.password}>
							<Input name="password" type="password" autoComplete="current-password" required autoFocus />
						</Field>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="danger"
								type="submit"
								disabled={busy("delete-account")}
								className="!bg-red-700 !text-white hover:!bg-red-800"
							>
								{busy("delete-account") ? "Deleting…" : "Delete everything"}
							</Button>
							<Button variant="ghost" onClick={() => setConfirming(false)}>
								Cancel
							</Button>
						</div>
					</Form>
				) : (
					<Button variant="danger" onClick={() => setConfirming(true)}>
						Delete my account
					</Button>
				)}
			</Section>
		</>
	);
}

function IconDownload() {
	return (
		<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
			<path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
