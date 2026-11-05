import { useRef } from "react";
import { Form, Link, useNavigation, useSubmit } from "react-router";
import { requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Alert, Button, Field, Input, Notice } from "~/components/ui";
import { Avatar } from "~/components/Avatar";
import { Section, resultFor } from "~/components/settings/Section";
import type { Route } from "./+types/profile";

export const meta = () => [{ title: "Profile · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireUser(request, context);

	return { user };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));

	switch (intent) {
		case "avatar":
			return settingsAction(intent, async () => {
				await api.account.updateAvatar(form.get("avatar") as File);

				return { message: "Profile photo updated." };
			});
		case "remove-avatar":
			return settingsAction(intent, async () => {
				await api.account.removeAvatar();

				return { message: "Profile photo removed." };
			});
		case "verify":
			return settingsAction(intent, async () => {
				await api.account.sendVerification();

				return { message: "Sent. Open the link in the email to confirm." };
			});
		default:
			return settingsAction("profile", async () => {
				await api.account.updateProfile({ name: String(form.get("name") ?? "") });

				return { message: "Saved." };
			});
	}
}

export default function Profile({ loaderData, actionData }: Route.ComponentProps) {
	const { user } = loaderData;
	const navigation = useNavigation();
	const submit = useSubmit();
	const fileInput = useRef<HTMLInputElement>(null);
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const avatar = resultFor(actionData, "avatar") ?? resultFor(actionData, "remove-avatar");
	const profile = resultFor(actionData, "profile");
	const verify = resultFor(actionData, "verify");

	return (
		<>
			<Section title="Profile" description="How you appear on books you share.">
				<div className="flex flex-wrap items-center gap-5">
					<Avatar user={user} size="lg" />
					<div className="space-y-2">
						<div className="flex flex-wrap gap-2">
							<Form method="post" encType="multipart/form-data">
								<input type="hidden" name="intent" value="avatar" />
								<input
									ref={fileInput}
									type="file"
									name="avatar"
									accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic"
									className="hidden"
									onChange={(event) => event.currentTarget.files?.length && submit(event.currentTarget.form)}
								/>
								<Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy("avatar")}>
									{busy("avatar") ? "Uploading…" : user.avatarUrl ? "Change photo" : "Add a photo"}
								</Button>
							</Form>
							{user.avatarUrl && (
								<Form method="post">
									<Button variant="ghost" type="submit" name="intent" value="remove-avatar">
										Remove
									</Button>
								</Form>
							)}
						</div>
						<p className="text-xs text-ink-500">JPG, PNG, WebP or HEIC, up to 10 MB.</p>
					</div>
				</div>
				{avatar?.error && <div className="mt-4"><Alert>{avatar.fieldErrors.avatar ?? avatar.error}</Alert></div>}
				{avatar?.message && <div className="mt-4"><Notice>{avatar.message}</Notice></div>}

				<Form method="post" className="mt-8 max-w-md space-y-4">
					<input type="hidden" name="intent" value="profile" />
					<Field label="Your name" error={profile?.fieldErrors.name}>
						<Input name="name" autoComplete="name" required maxLength={120} defaultValue={user.name} />
					</Field>
					<div className="flex items-center gap-3">
						<Button type="submit" disabled={busy("profile")}>
							{busy("profile") ? "Saving…" : "Save"}
						</Button>
						{profile?.message && <span className="text-sm text-emerald-700">{profile.message}</span>}
					</div>
				</Form>
			</Section>

			<Section title="Email" description="Where we send sign-in and security emails.">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="font-medium text-ink-900">{user.email}</p>
						{user.emailVerified ? (
							<p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
								<IconCheck /> Confirmed
							</p>
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
				{verify?.message && <div className="mt-4"><Notice>{verify.message}</Notice></div>}
				{verify?.error && <div className="mt-4"><Alert>{verify.error}</Alert></div>}
				<p className="mt-4 text-sm text-ink-500">
					To use a different address, change it under <Link to="/settings/security" className="text-ember-600 hover:underline">Sign-in & security</Link>.
				</p>
			</Section>
		</>
	);
}

function IconCheck() {
	return (
		<svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
			<path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
		</svg>
	);
}
