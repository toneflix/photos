import { useState } from "react";
import { Form, useNavigation } from "react-router";
import QRCode from "qrcode";
import type { Session, TwoFactorStatus } from "@photos/types";
import { requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Alert, Button, Field, Input, Notice } from "~/components/ui";
import { Section, resultFor, type SettingsResult } from "~/components/settings/Section";
import type { Route } from "./+types/security";

export const meta = () => [{ title: "Sign-in & security · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user, api } = await requireUser(request, context);
	const [{ data: twoFactor }, { data: sessions }] = await Promise.all([api.account.twoFactor(), api.account.sessions()]);

	return { user, twoFactor, sessions };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));
	const field = (name: string) => String(form.get(name) ?? "");

	switch (intent) {
		case "email":
			return settingsAction(intent, async () => {
				const { data: user } = await api.account.updateEmail({ email: field("email"), password: field("password") });

				return { message: `Email changed. We sent a confirmation link to ${user.email}.` };
			});
		case "password":
			return settingsAction(intent, async () => {
				await api.account.updatePassword({
					currentPassword: field("currentPassword"),
					password: field("password"),
					password_confirmation: field("password_confirmation"),
				});

				return { message: "Password changed. Your other devices were signed out." };
			});
		case "two-factor-setup":
			return settingsAction(intent, async () => {
				const { data: setup } = await api.account.setupTwoFactor();

				return { message: "", setup: { ...setup, qr: await qrSvg(setup.otpauthUrl) } };
			});
		case "two-factor-enable": {
			const setup = { secret: field("secret"), otpauthUrl: field("otpauthUrl"), qr: await qrSvg(field("otpauthUrl")) };

			return settingsAction(
				intent,
				async () => {
					const { data } = await api.account.enableTwoFactor({ code: field("code") });

					return { message: "Two-step sign-in is on.", recoveryCodes: data.recoveryCodes };
				},
				{ setup },
			);
		}
		case "recovery-codes":
			return settingsAction(intent, async () => {
				const { data } = await api.account.regenerateRecoveryCodes();

				return { message: "Your old recovery codes no longer work.", recoveryCodes: data.recoveryCodes };
			});
		case "two-factor-disable":
			return settingsAction(intent, async () => {
				await api.account.disableTwoFactor({ password: field("password") });

				return { message: "Two-step sign-in is off." };
			});
		case "revoke":
			return settingsAction(intent, async () => {
				const { data: session } = await api.account.revokeSession(field("session"));

				return { message: `${session.name} was signed out.` };
			});
		case "revoke-others":
			return settingsAction(intent, async () => {
				const { data } = await api.account.revokeOtherSessions();

				return { message: data.revoked === 1 ? "1 device was signed out." : `${data.revoked} devices were signed out.` };
			});
		default:
			return null;
	}
}

const qrSvg = (text: string) =>
	QRCode.toString(text, { type: "svg", margin: 0, color: { dark: "#1f1b16", light: "#ffffff" } });

type Result = SettingsResult & {
	setup?: { secret: string; otpauthUrl: string; qr: string };
	recoveryCodes?: string[];
};

export default function Security({ loaderData, actionData }: Route.ComponentProps) {
	const { user, twoFactor, sessions } = loaderData;
	const result = (actionData ?? undefined) as Result | undefined;
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;

	return (
		<>
			<ChangeEmail email={user.email} result={resultFor(result, "email")} busy={busy("email")} />
			<ChangePassword result={resultFor(result, "password")} busy={busy("password")} />
			<TwoStep status={twoFactor} result={result} busy={busy} />
			<Devices sessions={sessions} result={resultFor(result, "revoke") ?? resultFor(result, "revoke-others")} busy={busy} />
		</>
	);
}

function ChangeEmail({ email, result, busy }: { email: string; result?: SettingsResult; busy: boolean }) {
	return (
		<Section title="Email address" description={<>You sign in with <strong className="text-ink-700">{email}</strong>.</>}>
			<Form method="post" className="grid max-w-xl gap-4 sm:grid-cols-2">
				<input type="hidden" name="intent" value="email" />
				<Field label="New email" error={result?.fieldErrors.email}>
					<Input name="email" type="email" autoComplete="email" required />
				</Field>
				<Field label="Your password" error={result?.fieldErrors.password}>
					<Input name="password" type="password" autoComplete="current-password" required />
				</Field>
				<div className="flex flex-wrap items-center gap-3 sm:col-span-2">
					<Button type="submit" disabled={busy}>
						{busy ? "Changing…" : "Change email"}
					</Button>
					<span className="text-xs text-ink-500">We'll let your old address know, and ask you to confirm the new one.</span>
				</div>
				{result?.message && <div className="sm:col-span-2"><Notice>{result.message}</Notice></div>}
			</Form>
		</Section>
	);
}

function ChangePassword({ result, busy }: { result?: SettingsResult; busy: boolean }) {
	return (
		<Section title="Password" description="Changing it signs you out everywhere else.">
			<Form method="post" className="max-w-md space-y-4" key={result?.message ?? "password"}>
				<input type="hidden" name="intent" value="password" />
				<Field label="Current password" error={result?.fieldErrors.currentPassword}>
					<Input name="currentPassword" type="password" autoComplete="current-password" required />
				</Field>
				<Field label="New password" error={result?.fieldErrors.password} hint="At least 8 characters.">
					<Input name="password" type="password" autoComplete="new-password" minLength={8} required />
				</Field>
				<Field label="Type it again">
					<Input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required />
				</Field>
				<Button type="submit" disabled={busy}>
					{busy ? "Saving…" : "Change password"}
				</Button>
				{result?.message && <Notice>{result.message}</Notice>}
			</Form>
		</Section>
	);
}

function TwoStep({ status, result, busy }: { status: TwoFactorStatus; result?: Result; busy: (intent: string) => boolean }) {
	const setup = resultFor(result, "two-factor-setup") as Result | undefined;
	const enable = resultFor(result, "two-factor-enable") as Result | undefined;
	const regenerated = resultFor(result, "recovery-codes") as Result | undefined;
	const disable = resultFor(result, "two-factor-disable");
	const recoveryCodes = enable?.recoveryCodes ?? regenerated?.recoveryCodes;
	const pending = setup?.setup ?? (enable?.error ? enable.setup : undefined);

	return (
		<Section
			title="Two-step sign-in"
			description="Ask for a code from an authenticator app, like Google Authenticator or 1Password, after your password."
		>
			{recoveryCodes ? (
				<RecoveryCodes codes={recoveryCodes} message={enable?.message ?? regenerated?.message ?? null} />
			) : status.enabled ? (
				<div className="space-y-6">
					<div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-emerald-50 px-4 py-3">
						<p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
							<span className="h-2 w-2 rounded-full bg-emerald-500" /> On since{" "}
							{status.enabledAt ? new Date(status.enabledAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "recently"}
						</p>
						<p className="text-sm text-emerald-900">{status.recoveryCodesRemaining} recovery codes left</p>
					</div>
					<Form method="post">
						<Button variant="secondary" type="submit" name="intent" value="recovery-codes" disabled={busy("recovery-codes")}>
							Make new recovery codes
						</Button>
					</Form>
					<Form method="post" className="flex max-w-xl flex-wrap items-end gap-3 border-t border-paper-200 pt-6">
						<input type="hidden" name="intent" value="two-factor-disable" />
						<div className="min-w-56 flex-1">
							<Field label="Password to turn it off" error={disable?.fieldErrors.password}>
								<Input name="password" type="password" autoComplete="current-password" required />
							</Field>
						</div>
						<Button variant="danger" type="submit" disabled={busy("two-factor-disable")}>
							Turn off
						</Button>
					</Form>
				</div>
			) : pending ? (
				<SetupSteps setup={pending} result={enable} busy={busy("two-factor-enable")} />
			) : (
				<div className="space-y-4">
					{disable?.message && <Notice>{disable.message}</Notice>}
					<p className="flex items-center gap-2 text-sm text-ink-500">
						<span className="h-2 w-2 rounded-full bg-paper-300" /> Off. Anyone with your password can sign in.
					</p>
					<Form method="post">
						<Button type="submit" name="intent" value="two-factor-setup" disabled={busy("two-factor-setup")}>
							{busy("two-factor-setup") ? "Starting…" : "Turn on two-step sign-in"}
						</Button>
					</Form>
				</div>
			)}
		</Section>
	);
}

function SetupSteps({ setup, result, busy }: { setup: NonNullable<Result["setup"]>; result?: SettingsResult; busy: boolean }) {
	return (
		<div className="grid gap-8 sm:grid-cols-[11rem_1fr]">
			<div className="space-y-3">
				<div
					className="aspect-square w-44 rounded-2xl border border-paper-200 bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
					dangerouslySetInnerHTML={{ __html: setup.qr }}
				/>
			</div>
			<Form method="post" className="space-y-4">
				<input type="hidden" name="intent" value="two-factor-enable" />
				<input type="hidden" name="secret" value={setup.secret} />
				<input type="hidden" name="otpauthUrl" value={setup.otpauthUrl} />
				<ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
					<li>Scan the code with your authenticator app.</li>
					<li>
						Can't scan it? Enter this key instead:
						<code className="mt-1 block rounded-lg bg-paper-100 px-3 py-2 font-mono text-xs break-all text-ink-900">
							{setup.secret.match(/.{1,4}/g)?.join(" ")}
						</code>
					</li>
					<li>Type the 6-digit code the app shows.</li>
				</ol>
				<div className="flex flex-wrap items-end gap-3">
					<div className="w-44">
						<Field label="Code" error={result?.fieldErrors.code}>
							<Input
								name="code"
								inputMode="numeric"
								autoComplete="one-time-code"
								maxLength={7}
								placeholder="123 456"
								className="text-center font-mono text-lg tracking-[0.25em]"
								required
								autoFocus
							/>
						</Field>
					</div>
					<Button type="submit" disabled={busy}>
						{busy ? "Checking…" : "Turn on"}
					</Button>
				</div>
			</Form>
		</div>
	);
}

function RecoveryCodes({ codes, message }: { codes: string[]; message: string | null }) {
	const [copied, setCopied] = useState(false);
	const text = codes.join("\n");

	return (
		<div className="space-y-4">
			{message && <Notice>{message}</Notice>}
			<p className="text-sm text-ink-700">
				Save these recovery codes somewhere safe. Each one signs you in once if you lose your phone. You won't see them again.
			</p>
			<ul className="grid max-w-md grid-cols-2 gap-2 rounded-2xl bg-paper-100 p-4 font-mono text-sm text-ink-900">
				{codes.map((code) => (
					<li key={code}>{code}</li>
				))}
			</ul>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="secondary"
					onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
				>
					{copied ? "Copied" : "Copy"}
				</Button>
				<a
					href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Toneflix Photos recovery codes\n\n${text}\n`)}`}
					download="toneflix-photos-recovery-codes.txt"
					className="inline-flex items-center rounded-full border border-paper-300 bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-paper-100"
				>
					Download
				</a>
				<a href="/settings/security" className="inline-flex items-center rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-700">
					I've saved them
				</a>
			</div>
		</div>
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
		<Section title="Where you're signed in" description="Sign out of any device you don't recognise, then change your password.">
			{result?.message && <div className="mb-4"><Notice>{result.message}</Notice></div>}
			{result?.error && <div className="mb-4"><Alert>{result.error}</Alert></div>}
			<ul className="divide-y divide-paper-200">
				{sessions.map((session) => (
					<li key={session.id} className="flex items-center gap-4 py-4 first:pt-0">
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper-100 text-ink-700">
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
				<Form method="post" className="mt-4 border-t border-paper-200 pt-4">
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
