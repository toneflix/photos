import { Link } from "react-router";
import type { BookWithPages } from "@photos/types";

interface Option {
	label: string;
	detail: string;
	href: string;
	/** A plan upgrade rather than a file. */
	upgrade?: boolean;
}

/**
 * The book's Download button. With one file it downloads it; with more it is a split button whose
 * main part downloads the first and whose arrow lists them all. Owners whose plan lacks a page
 * download see it in the list as a Premium feature.
 */
export function BookDownload({ book, className }: { book: BookWithPages; className: string }) {
	const options: Option[] = [];

	if (book.canDownload)
		options.push({
			label: "Photos",
			detail: book.permissions.includes("transfer") ? "Every original photo, as a zip" : "Openly licensed photos, as a zip",
			href: `/books/${book.id}/download`,
		});
	for (const [format, label, detail] of [
		["pdf", "Pages as a PDF", "Every page as designed, ready to print"],
		["images", "Pages as images", "Each page as designed, as a PNG in a zip"],
	] as const) {
		if (book.pageDownloads[format]) options.push({ label, detail, href: `/books/${book.id}/pages/${format}` });
		else if (book.isOwner) options.push({ label, detail, href: "/pricing", upgrade: true });
	}

	const files = options.filter((option) => !option.upgrade);
	const main = files[0];

	if (!options.length) return null;
	if (options.length === 1 && main)
		return (
			<a href={main.href} download className={`${className} inline-flex items-center gap-2 max-sm:px-2`} title={main.detail}>
				<DownloadIcon />
				<span className="max-sm:sr-only">Download</span>
			</a>
		);

	return (
		<div className="relative inline-flex">
			{main && (
				<a href={main.href} download className={`${className} inline-flex items-center gap-2 rounded-r-none pr-3 max-sm:px-2`} title={main.detail}>
					<DownloadIcon />
					<span className="max-sm:sr-only">Download</span>
				</a>
			)}
			<details className="group">
				<summary
					className={`${className} inline-flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden ${main ? "rounded-l-none border-l border-white/20 pl-2 pr-3" : "max-sm:px-2"}`}
					aria-label="Download options"
				>
					{!main && (
						<>
							<DownloadIcon />
							<span className="max-sm:sr-only">Download</span>
						</>
					)}
					<svg viewBox="0 0 24 24" className="h-4 w-4 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</summary>
				<div className="absolute right-0 z-50 mt-2 w-64 panel rounded-xl p-2 text-left !shadow-xl">
					{options.map((option) =>
						option.upgrade ? (
							<Link key={option.label} prefetch="intent" to={option.href} className="block rounded-md px-3 py-2 hover:bg-surface-100">
								<span className="flex items-center gap-2 text-sm font-medium text-ink-900">
									{option.label}
									<span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-700">Premium</span>
								</span>
								<span className="block text-xs text-ink-500">{option.detail}</span>
							</Link>
						) : (
							<a key={option.label} href={option.href} download className="block rounded-md px-3 py-2 hover:bg-surface-100">
								<span className="block text-sm font-medium text-ink-900">{option.label}</span>
								<span className="block text-xs text-ink-500">{option.detail}</span>
							</a>
						),
					)}
				</div>
			</details>
		</div>
	);
}

function DownloadIcon() {
	return (
		<svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
