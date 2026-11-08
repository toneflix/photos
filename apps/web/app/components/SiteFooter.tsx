import { Link } from "react-router";
import { documentPath, useDocuments } from "~/lib/documents";

/** Links to the published pages and policies, under public pages. */
export function SiteFooter() {
	const documents = useDocuments();

	return (
		<footer className="border-t-[1.5px] border-surface-200">
			<div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
				<p>© {new Date().getFullYear()} Toneflix</p>
				<nav aria-label="About and policies" className="flex flex-wrap gap-x-5 gap-y-2">
					{documents.map((document) => (
						<Link key={document.id} prefetch="intent" to={documentPath(document)} className="font-medium hover:text-ink-900">
							{document.title}
						</Link>
					))}
					<Link prefetch="intent" to="/licenses" className="font-medium hover:text-ink-900">
						Photo licences
					</Link>
				</nav>
			</div>
		</footer>
	);
}
