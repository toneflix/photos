import { requireUser } from "~/lib/session.server";
import { buttonClass } from "~/components/ui";
import { PageHeader, Section } from "~/components/settings/Section";
import type { Route } from "./+types/data";

export const meta = () => [{ title: "Your data · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	await requireUser(request, context);

	return null;
}

export default function Data() {
	return (
		<>
			<PageHeader title="Your data" description="Everything you've kept here is yours. Take a copy whenever you like." />
			<Section>
				<ul className="space-y-2 text-sm text-ink-700">
					<li>Every photo, as the original file you uploaded</li>
					<li>Your books, with each page's layout, photos and words</li>
					<li>Your account details and settings</li>
				</ul>
				<a href="/settings/export" download className={buttonClass("primary", "mt-6")}>
					<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
						<path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					Download a zip
				</a>
				<p className="mt-3 text-xs text-ink-500">Large libraries can take a minute to start downloading.</p>
			</Section>
		</>
	);
}
