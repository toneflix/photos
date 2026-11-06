import { Form, useNavigation } from "react-router";
import type { Session } from "@photos/types";
import { requireSignIn } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { useToastMessage } from "~/lib/toast";
import { Alert, Button } from "~/components/ui";
import { PageHeader, Section, resultFor, type SettingsResult } from "~/components/settings/Section";
import type { Route } from "./+types/devices";

export const meta = () => [{ title: "Devices · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const { data: sessions } = await api.account.sessions();

	return { sessions };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();

	if (form.get("intent") === "revoke-others") {
		return settingsAction("revoke-others", async () => {
			const { data } = await api.account.revokeOtherSessions();

			return { message: data.revoked === 1 ? "1 device was signed out." : `${data.revoked} devices were signed out.` };
		});
	}

	return settingsAction("revoke", async () => {
		const { data: session } = await api.account.revokeSession(String(form.get("session") ?? ""));

		return { message: `${session.name} was signed out.` };
	});
}

export default function DevicesPage({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;

	return (
		<>
			<PageHeader title="Devices" description="Where you're signed in. Sign out of any device you don't recognise, then change your password." />
			<Devices sessions={loaderData.sessions} result={resultFor(actionData ?? undefined, "revoke") ?? resultFor(actionData ?? undefined, "revoke-others")} busy={busy} />
		</>
	);
}

function Devices({
	sessions,
	result,
	busy,
}: {
	sessions: Session[];
	result?: SettingsResult;
	busy: (intent: string) => boolean;
}) {
	const others = sessions.filter((session) => !session.current).length;

	return (
		<Section>
			{result?.error && <div className="mb-4"><Alert>{result.error}</Alert></div>}
			<ul className="divide-y divide-surface-200">
				{sessions.map((session) => (
					<li key={session.id} className="flex items-center gap-4 py-4 first:pt-0">
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-ink-700">
							<DeviceIcon type={session.deviceType} />
						</span>
						<div className="min-w-0 flex-1">
							<p className="flex flex-wrap items-center gap-2 font-medium text-ink-900">
								{session.name}
								{session.current && (
									<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">This device</span>
								)}
							</p>
							<p className="text-sm text-ink-500">
								{[deviceDetail(session), session.ipAddress, lastActive(session)].filter(Boolean).join(" · ")}
							</p>
						</div>
						{!session.current && (
							<Form method="post">
								<input type="hidden" name="session" value={session.id} />
								<Button variant="ghost" type="submit" name="intent" value="revoke" className="text-red-700">
									Sign out
								</Button>
							</Form>
						)}
					</li>
				))}
			</ul>
			{others > 0 && (
				<Form method="post" className="mt-4 border-t border-surface-200 pt-4">
					<Button variant="secondary" type="submit" name="intent" value="revoke-others" disabled={busy("revoke-others")}>
						Sign out of all other devices
					</Button>
				</Form>
			)}
		</Section>
	);
}

/** Browser and system, unless the device name already says it. */

function deviceDetail(session: Session) {
	const detail = session.browser && session.os ? `${session.browser} on ${session.os}` : (session.browser ?? session.os);

	return detail === session.name ? null : detail;
}

function lastActive(session: Session) {
	if (session.current) return "Active now";

	const at = new Date(session.lastUsedAt ?? session.createdAt).getTime();
	const minutes = Math.round((Date.now() - at) / 60_000);

	if (minutes < 5) return "Active now";
	if (minutes < 60) return `Active ${minutes} min ago`;
	if (minutes < 60 * 24) return `Active ${Math.round(minutes / 60)} h ago`;

	return `Last active ${new Date(at).toLocaleDateString(undefined, { dateStyle: "medium" })}`;
}

function DeviceIcon({ type }: { type: Session["deviceType"] }) {
	if (type === "mobile" || type === "tablet") {
		return (
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
				<rect x={type === "tablet" ? 4 : 6.5} y="2.5" width={type === "tablet" ? 16 : 11} height="19" rx="2.5" />
				<path d="M11 18.5h2" strokeLinecap="round" />
			</svg>
		);
	}

	return (
		<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
			<rect x="3" y="4" width="18" height="12" rx="2" />
			<path d="M8 20h8M12 16v4" strokeLinecap="round" />
		</svg>
	);
}
