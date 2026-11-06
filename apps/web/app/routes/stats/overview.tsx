import { RANGES, RangePicker, StatTiles, StatsChart } from "~/components/stats/StatsChart";
import { TopList } from "~/components/stats/TopList";
import { requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/overview";

export const meta = () => [{ title: "Your stats · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const days = RANGES.find((range) => range === Number(new URL(request.url).searchParams.get("days"))) ?? 30;
	const { data: stats } = await api.account.stats(days);

	return { stats, days };
}

const number = new Intl.NumberFormat("en");

export default function StatsOverview({ loaderData }: Route.ComponentProps) {
	const { stats, days } = loaderData;

	return (
		<main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
			<div>
				<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900">Your stats</h1>
				<p className="mt-1 max-w-xl text-ink-500">How often people open and download your photos, books and spaces. Your own visits don’t count.</p>
			</div>

			<StatTiles
				items={[
					{ label: "Views", value: number.format(stats.totals.views), note: "All your work, all time" },
					{ label: "Downloads", value: number.format(stats.totals.downloads), note: "Photos and books" },
					{ label: "Photos", value: number.format(stats.photoCount) },
					{ label: "Books", value: number.format(stats.bookCount) },
					{ label: "Spaces", value: number.format(stats.spaceCount) },
				]}
			/>

			<div className="space-y-3">
				<RangePicker days={days} />
				<StatsChart days={stats.daily} title={`Your work over the last ${days} days`} />
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<TopList title="Most viewed photos" items={stats.topPhotos} href={(item) => `/stats/photos/${item.id}`} empty="No photos yet." showOwner={false} />
				<TopList title="Most viewed books" items={stats.topBooks} href={(item) => `/stats/books/${item.id}`} empty="No books yet." showOwner={false} />
				<TopList title="Most viewed spaces" items={stats.topSpaces} href={(item) => `/stats/spaces/${item.id}`} empty="No spaces yet." showOwner={false} />
			</div>
		</main>
	);
}
