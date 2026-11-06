import { Link } from "react-router";
import type { PhotoLicense } from "@photos/types";
import { CONTENT_KINDS, publicLink } from "~/components/admin/content";
import { RANGES, RangePicker, StatTiles, StatsChart } from "~/components/stats/StatsChart";
import { buttonClass } from "~/components/ui";
import { licenseFor } from "~/lib/licenses";
import { requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/item";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.item.title ?? "Stats"} · Your stats · Toneflix Photos` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const kind = CONTENT_KINDS.find((entry) => entry.kind === params.kind);

	if (!kind) throw new Response("Not found", { status: 404 });

	const { api } = await requireSignIn(request, context);
	const days = RANGES.find((range) => range === Number(new URL(request.url).searchParams.get("days"))) ?? 30;
	const { data: item } = await api.account.itemStats(kind.kind, params.id, days);

	return { kind, days, item };
}

const number = new Intl.NumberFormat("en");
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Unknown");

export default function ItemStats({ loaderData }: Route.ComponentProps) {
	const { kind, days, item } = loaderData;
	const address = item.details.find((detail) => detail.label === "Address")?.value;
	const open = item.kind === "book" || item.visibility === "public" ? publicLink(item, address?.split("/").pop()) : null;

	return (
		<main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					<Link prefetch="intent" to="/stats" className="text-sm font-semibold text-brand-700 hover:underline">
						All your stats
					</Link>
					<h1 className="mt-1 truncate font-display text-4xl font-bold tracking-tight text-ink-900">{item.title}</h1>
					<p className="mt-1 text-ink-500">
						{item.visibility === "public" ? `A public ${kind.one} since ${date(item.publishedAt)}.` : `A private ${kind.one}.`}
					</p>
				</div>
				{open && (
					<Link prefetch="intent" to={open} className={buttonClass("secondary")}>
						Open
					</Link>
				)}
			</div>

			<StatTiles
				items={[
					{ label: "Views", value: number.format(item.viewCount), note: "All time" },
					...(item.downloadCount === null ? [] : [{ label: "Downloads", value: number.format(item.downloadCount), note: "All time" }]),
				]}
			/>

			<div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
				{item.daily ? (
					<div className="space-y-3">
						<RangePicker days={days} />
						<StatsChart days={item.daily} title={`Last ${days} days`} downloads={item.downloadCount !== null} />
					</div>
				) : (
					<section className="panel flex flex-col justify-center gap-2 px-6 py-10 text-center">
						<h2 className="font-display text-lg font-bold text-ink-900">Daily charts for books come with Premium</h2>
						<p className="mx-auto max-w-md text-sm text-ink-500">Your plan shows each book’s totals. Premium adds a chart of its views and downloads day by day.</p>
					</section>
				)}

				<aside className="panel overflow-hidden">
					{item.imageUrl && <img src={item.imageUrl} alt="" className="aspect-[4/3] w-full bg-surface-100 object-cover" />}
					<dl className="divide-y divide-surface-200 text-sm">
						{[...item.details, { label: "Created", value: date(item.createdAt) }].map((detail) => (
							<div key={detail.label} className="flex justify-between gap-4 px-5 py-3">
								<dt className="text-ink-500">{detail.label}</dt>
								<dd className="text-right font-medium break-all text-ink-900">{detail.label === "Licence" ? licenseFor(detail.value as PhotoLicense).label : detail.value}</dd>
							</div>
						))}
					</dl>
				</aside>
			</div>
		</main>
	);
}
