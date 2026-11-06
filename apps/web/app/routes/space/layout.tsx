import { useState } from "react";
import { ContentCounts } from "~/components/ContentCounts";
import { data, Link, NavLink, Outlet, type MetaDescriptor, type ShouldRevalidateFunctionArgs } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { revalidateOnSubmit } from "~/lib/revalidate";
import { Owner } from "~/components/explore/Owner";
import { SpaceCover } from "~/components/spaces/SpaceCover";
import { VisibilityBadge, spaceCounts } from "~/components/spaces/SpaceCard";
import { buttonClass } from "~/components/ui";
import type { Route } from "./+types/layout";

/** Meta arguments for pages that also open inside a space and use its title there. */
export interface SpaceMetaArgs {
	params: { slug?: string };
	matches: ({ id: string; meta: MetaDescriptor[] } | undefined)[];
}

export function meta({ loaderData }: Route.MetaArgs) {
	const space = loaderData?.space;

	if (!space) return [{ title: "Space not found · Toneflix Photos" }];

	return [{ title: `${space.name} · Toneflix Photos` }, { name: "description", content: space.description ?? `Photos and books from ${space.name}.` }];
}

/** A space's page. Public spaces open for everyone; private ones only for their owner and members. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const { data: space } = await api.explore.space(params.slug).catch(() => {
		throw data("Space not found", { status: 404 });
	});

	return { space };
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
	return args.currentParams.slug !== args.nextParams.slug || revalidateOnSubmit(args);
}

const tab = ({ isActive }: { isActive: boolean }) =>
	`-mb-[1.5px] border-b-[3px] px-1 pb-3 text-sm font-semibold transition ${
		isActive ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-900"
	}`;

/** The space's header with its Photos and Books tabs. Browsing below works like Explore, kept to this space. */
export default function SpaceLayout({ loaderData }: Route.ComponentProps) {
	const { space } = loaderData;
	const [copied, setCopied] = useState(false);
	const canAdd = !space.canEdit && space.permissions.includes("create");
	const canManage = space.permissions.includes("manage");

	const share = async () => {
		await navigator.clipboard?.writeText(window.location.href.split("?")[0]).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			{space.canEdit && space.visibility === "private" && (
				<p className="mb-6 rounded-xl bg-surface-100 px-5 py-3 text-sm text-ink-700">
					Only you and the people you invite can see this page. It shows its public photos and books, which everyone will see once you make the space
					public.{" "}
					<Link prefetch="intent" to={`/spaces?edit=${space.id}`} className="font-semibold text-brand-700 hover:underline">
						Make it public
					</Link>
				</p>
			)}
			{!space.canEdit && space.visibility === "private" && (
				<p className="mb-6 rounded-xl bg-surface-100 px-5 py-3 text-sm text-ink-700">
					This space is private. You can see it because you're a member.
				</p>
			)}
			<header className="flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between">
				<div className="min-w-0">
					<div className="flex items-center gap-3">
						<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{space.name}</h1>
						{space.visibility === "private" && <VisibilityBadge />}
					</div>
					{space.description && <p className="mt-3 max-w-2xl text-lg text-ink-700">{space.description}</p>}
					<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
						<Owner owner={space.owner} />
						<span className="text-sm text-ink-500">{spaceCounts(space)}</span>
						<ContentCounts stats={space.stats} />
					</div>
					<div className="mt-5 flex flex-wrap gap-2">
						{space.visibility === "public" && (
							<button type="button" onClick={share} className={buttonClass("secondary")}>
								{copied ? "Link copied" : "Copy link"}
							</button>
						)}
						{space.canEdit && (
							<>
								<Link prefetch="intent" to={`/photos?space=${space.id}`} className={buttonClass("primary")}>
									Add photos
								</Link>
								<Link prefetch="intent" to={`/spaces?edit=${space.id}`} className={buttonClass("ghost")}>
									Edit space
								</Link>
							</>
						)}
						{canAdd && (
							<>
								<Link prefetch="intent" to={`/photos?space=${space.id}`} className={buttonClass("primary")}>
									Add your photos
								</Link>
								<Link prefetch="intent" to={`/books?space=${space.id}`} className={buttonClass("secondary")}>
									Add a book
								</Link>
							</>
						)}
					</div>
				</div>
				{space.previews.length > 0 && (
					<SpaceCover photos={space.previews} className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl shadow-lg md:w-80" />
				)}
			</header>
			<nav className="mt-10 flex gap-6 border-b-[1.5px] border-surface-200">
				<NavLink prefetch="intent" to={`/spaces/${space.slug}`} end className={tab}>
					Photos
				</NavLink>
				<NavLink prefetch="intent" to={`/spaces/${space.slug}/books`} className={tab}>
					Books
				</NavLink>
				{canManage && (
					<NavLink prefetch="intent" to={`/spaces/${space.slug}/members`} className={tab}>
						Members
					</NavLink>
				)}
			</nav>
			<div className="mt-8">
				<Outlet />
			</div>
		</main>
	);
}
