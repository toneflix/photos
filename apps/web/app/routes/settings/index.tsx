import { Link } from "react-router";
import { requireSignIn, requireUser } from "~/lib/session.server";
import { Avatar } from "~/components/Avatar";
import { SETTINGS_GROUPS } from "~/components/settings/nav";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const [{ user }, { data: twoFactor }, { data: sessions }] = await Promise.all([
		requireUser(request, context),
		api.account.twoFactor(),
		api.account.sessions(),
	]);

	return { user, twoFactorOn: twoFactor.enabled, devices: sessions.length };
}

const VISIBILITY_LABEL = { private: "Only me", shared: "Anyone with the link", public: "Public" };

/** The settings home: every page in its group, with where each one stands now. */
export default function SettingsHome({ loaderData }: Route.ComponentProps) {
	const { user, twoFactorOn, devices } = loaderData;

	const status: Record<string, { text: string; tone?: "good" | "warn" }> = {
		"/settings/profile": { text: user.name },
		"/settings/email": user.emailVerified ? { text: "Confirmed", tone: "good" } : { text: "Not confirmed", tone: "warn" },
		"/settings/two-step": twoFactorOn ? { text: "On", tone: "good" } : { text: "Off", tone: "warn" },
		"/settings/devices": { text: devices === 1 ? "1 device" : `${devices} devices` },
		"/settings/sharing": { text: VISIBILITY_LABEL[user.defaultVisibility] },
	};

	return (
		<>
			<h1 className="font-display font-bold tracking-tight text-4xl text-ink-900 md:hidden">Settings</h1>
			<Link prefetch="intent"
				to="/settings/profile"
				className="mt-6 flex items-center gap-4 rounded-2xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-surface-300 md:mt-0"
			>
				<Avatar user={user} size="lg" />
				<div className="min-w-0">
					<p className="font-display font-bold tracking-tight text-2xl text-ink-900">{user.name}</p>
					<p className="truncate text-sm text-ink-500">{user.email}</p>
				</div>
			</Link>

			<div className="mt-8 space-y-8">
				{SETTINGS_GROUPS.map((group) => (
					<section key={group.label}>
						<h2 className="px-1 text-xs font-semibold tracking-[0.14em] text-ink-500 uppercase">{group.label}</h2>
						<ul className="mt-3 divide-y divide-surface-200 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
							{group.pages.map((page) => {
								const state = status[page.to];
								const danger = "danger" in page;

								return (
									<li key={page.to}>
										<Link prefetch="intent" to={page.to} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-50">
											<div className="min-w-0 flex-1">
												<p className={`font-medium ${danger ? "text-red-700" : "text-ink-900"}`}>{page.label}</p>
												<p className="text-sm text-ink-500">{page.hint}</p>
											</div>
											{state && (
												<span
													className={`hidden max-w-48 truncate text-sm sm:block ${
														state.tone === "good" ? "text-emerald-700" : state.tone === "warn" ? "text-amber-700" : "text-ink-500"
													}`}
												>
													{state.text}
												</span>
											)}
											<svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
												<path d="m7.5 4.5 5.5 5.5-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</Link>
									</li>
								);
							})}
						</ul>
					</section>
				))}
			</div>
		</>
	);
}
