import { useState } from "react";
import { data, Link, NavLink, Outlet, type ShouldRevalidateFunctionArgs } from "react-router";
import { Avatar } from "~/components/Avatar";
import { ContentCounts } from "~/components/ContentCounts";
import { buttonClass } from "~/components/ui";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { revalidateOnSubmit } from "~/lib/revalidate";
import type { Route } from "./+types/layout";

export function meta({ loaderData }: Route.MetaArgs) {
	const maker = loaderData?.maker;

	if (!maker) return [{ title: "Maker not found · Toneflix Photos" }];

	return [{ title: `${maker.name} · Toneflix Photos` }, { name: "description", content: `Photos, books and spaces ${maker.name} shares on Toneflix Photos.` }];
}

/** A maker's profile. Makers who keep their name off shared work have none, but can still open their own. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const { data: maker } = await api.explore.maker(params.maker).catch(() => {
		throw data("Maker not found", { status: 404 });
	});

	return { maker };
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
	return args.currentParams.maker !== args.nextParams.maker || revalidateOnSubmit(args);
}

const tab = ({ isActive }: { isActive: boolean }) =>
	`-mb-[1.5px] border-b-[3px] px-1 pb-3 text-sm font-semibold transition ${
		isActive ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-900"
	}`;

const number = new Intl.NumberFormat("en");
const joined = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const plural = (count: number, one: string) => `${number.format(count)} ${count === 1 ? one : `${one}s`}`;

/** The maker's header with Photos, Books and Spaces tabs. Each tab lists their public work like Explore does. */
export default function MakerLayout({ loaderData }: Route.ComponentProps) {
	const { maker } = loaderData;
	const [copied, setCopied] = useState(false);
	const base = `/makers/${maker.id}`;

	const share = async () => {
		await navigator.clipboard?.writeText(window.location.href.split("?")[0]).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			{!maker.isListed && (
				<p className="mb-6 rounded-xl bg-surface-100 px-5 py-3 text-sm text-ink-700">
					Only you can see this page, because you keep your name off the work you share.{" "}
					<Link prefetch="intent" to="/settings/sharing" className="font-semibold text-brand-700 hover:underline">
						Show your name
					</Link>
				</p>
			)}
			<header className="flex flex-col gap-6 sm:flex-row sm:items-center">
				<Avatar user={maker} size="lg" />
				<div className="min-w-0">
					<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{maker.name}</h1>
					<p className="mt-2 text-ink-500">
						{plural(maker.photoCount, "photo")} · {plural(maker.bookCount, "book")} · {plural(maker.spaceCount, "space")} · Joined{" "}
						{joined.format(new Date(maker.joinedAt))}
					</p>
					<ContentCounts stats={maker.stats} className="mt-2" />
					<div className="mt-5 flex flex-wrap gap-2">
						{maker.isListed && (
							<button type="button" onClick={share} className={buttonClass("secondary")}>
								{copied ? "Link copied" : "Copy link"}
							</button>
						)}
						{maker.isOwner && (
							<Link prefetch="intent" to="/settings/profile" className={buttonClass("ghost")}>
								Edit profile
							</Link>
						)}
					</div>
				</div>
			</header>
			<nav className="mt-10 flex gap-6 border-b-[1.5px] border-surface-200">
				<NavLink prefetch="intent" to={base} end className={tab}>
					Photos
				</NavLink>
				<NavLink prefetch="intent" to={`${base}/books`} className={tab}>
					Books
				</NavLink>
				<NavLink prefetch="intent" to={`${base}/spaces`} className={tab}>
					Spaces
				</NavLink>
			</nav>
			<div className="mt-8">
				<Outlet />
			</div>
		</main>
	);
}
