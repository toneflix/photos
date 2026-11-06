import { useState } from "react";
import { Form, useNavigation } from "react-router";
import QRCode from "qrcode";
import type { TwoFactorStatus } from "@photos/types";
import { requireSignIn } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { Button, Field, Input, Notice, OtpInput } from "~/components/ui";
import { PageHeader, Section, resultFor, type SettingsResult } from "~/components/settings/Section";
import type { Route } from "./+types/two-step";

export const meta = () => [{ title: "Two-step sign-in · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const { data: twoFactor } = await api.account.twoFactor();

	return { twoFactor };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));
	const field = (name: string) => String(form.get(name) ?? "");

	switch (intent) {
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

export default function TwoStepPage({ loaderData, actionData }: Route.ComponentProps) {
	const result = (actionData ?? undefined) as Result | undefined;
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;

	return (
		<>
			<PageHeader
				title="Two-step sign-in"
				description="After your password, ask for a code from an authenticator app like Google Authenticator or 1Password."
			/>
			<TwoStep status={loaderData.twoFactor} result={result} busy={busy} />
		</>
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
		<Section>
			{recoveryCodes ? (
				<RecoveryCodes codes={recoveryCodes} message={enable?.message ?? regenerated?.message ?? null} />
			) : status.enabled ? (
				<div className="space-y-6">
					<div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-emerald-50 px-4 py-3">
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
					<Form method="post" className="flex max-w-xl flex-wrap items-end gap-3 border-t border-surface-200 pt-6">
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
						<span className="h-2 w-2 rounded-full bg-surface-300" /> Off. Anyone with your password can sign in.
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
					className="aspect-square w-44 panel rounded-xl p-3 [&_svg]:h-full [&_svg]:w-full"
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
						<code className="mt-1 block rounded-lg bg-surface-100 px-3 py-2 font-mono text-xs break-all text-ink-900">
							{setup.secret.match(/.{1,4}/g)?.join(" ")}
						</code>
					</li>
					<li>Type the 6-digit code the app shows.</li>
				</ol>
				<div className="max-w-xs space-y-3">
					<Field label="Code" error={result?.fieldErrors.code}>
						<OtpInput name="code" invalid={!!result?.fieldErrors.code} disabled={busy} autoFocus />
					</Field>
					<Button type="submit" disabled={busy} className="w-full">
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
			<ul className="grid max-w-md grid-cols-2 gap-2 rounded-xl bg-surface-100 p-4 font-mono text-sm text-ink-900">
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
					className="inline-flex items-center rounded-full border border-surface-300 bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-surface-100"
				>
					Download
				</a>
				<a href="/settings/two-step" className="inline-flex items-center rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-surface-50 hover:bg-ink-700">
					I've saved them
				</a>
			</div>
		</div>
	);
}
