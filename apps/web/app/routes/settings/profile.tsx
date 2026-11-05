import { useRef } from "react";
import { Form, useNavigation, useSubmit } from "react-router";
import { requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Alert, Button, Field, Input, Notice } from "~/components/ui";
import { Avatar } from "~/components/Avatar";
import { PageHeader, Section, resultFor } from "~/components/settings/Section";
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

	return (
		<>
			<PageHeader title="Profile" description="How you appear on the books you share." />
			<div className="space-y-6">
				<Section title="Photo">
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
					{avatar?.error && (
						<div className="mt-4">
							<Alert>{avatar.fieldErrors.avatar ?? avatar.error}</Alert>
						</div>
					)}
					{avatar?.message && (
						<div className="mt-4">
							<Notice>{avatar.message}</Notice>
						</div>
					)}
				</Section>

				<Section title="Name">
					<Form method="post" className="max-w-md space-y-4">
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
			</div>
		</>
	);
}
