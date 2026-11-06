import type { ContentCounts as Counts } from "@photos/types";

const number = new Intl.NumberFormat("en");
const plural = (count: number, one: string) => `${number.format(count)} ${count === 1 ? one : `${one}s`}`;

/** "120 views · 8 downloads" on public work. Renders nothing when the owner keeps counts private. */
export function ContentCounts({ stats, light = false, className = "" }: { stats: Counts | null | undefined; light?: boolean; className?: string }) {
	if (!stats) return null;

	const tone = light ? "text-white/80" : "text-ink-500";

	return (
		<p className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${tone} ${className}`}>
			<span className="flex items-center gap-1.5">
				<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
				</svg>
				{plural(stats.views, "view")}
			</span>
			{stats.downloads !== null && (
				<span className="flex items-center gap-1.5">
					<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
						<path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
					</svg>
					{plural(stats.downloads, "download")}
				</span>
			)}
		</p>
	);
}
