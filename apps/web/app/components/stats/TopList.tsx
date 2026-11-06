import { Link } from "react-router";
import type { ModerationItem } from "@photos/types";
import { Icon } from "~/components/admin/Icon";

const number = new Intl.NumberFormat("en");

/** Views, and downloads for things that have them, as small inline numbers. */
export function Counts({ item }: { item: Pick<ModerationItem, "viewCount" | "downloadCount"> }) {
	return (
		<p className="flex gap-4 text-sm text-ink-700">
			<span className="flex items-center gap-1.5">
				<Icon name="eye" className="h-4 w-4 text-ink-500" />
				{number.format(item.viewCount)} <span className="sr-only">views</span>
			</span>
			{item.downloadCount !== null && (
				<span className="flex items-center gap-1.5">
					<Icon name="download" className="h-4 w-4 text-ink-500" />
					{number.format(item.downloadCount)} <span className="sr-only">downloads</span>
				</span>
			)}
		</p>
	);
}

/** A short ranked list of work with its counts. `href` links each item to its own page. */
export function TopList({ title, items, href, empty = "Nothing public yet.", showOwner = true }: { title: string; items: ModerationItem[]; href?: (item: ModerationItem) => string; empty?: string; showOwner?: boolean }) {
	return (
		<section className="panel">
			<h2 className="border-b-[1.5px] border-surface-200 px-5 py-4 font-display text-lg font-bold text-ink-900">{title}</h2>
			{items.length === 0 ? (
				<p className="px-5 py-8 text-center text-sm text-ink-500">{empty}</p>
			) : (
				<ol className="divide-y divide-surface-200">
					{items.map((item) => {
						const body = (
							<>
								<div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-100">
									{item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
									{showOwner && item.owner && <p className="truncate text-sm text-ink-500">{item.owner.name}</p>}
								</div>
								<Counts item={item} />
							</>
						);

						return (
							<li key={item.id}>
								{href ? (
									<Link prefetch="intent" to={href(item)} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-100">
										{body}
									</Link>
								) : (
									<div className="flex items-center gap-3 px-5 py-3">{body}</div>
								)}
							</li>
						);
					})}
				</ol>
			)}
		</section>
	);
}
