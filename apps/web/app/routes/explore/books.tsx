import { Link } from "react-router";
import type { PublicBook } from "@photos/types";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { useInfiniteList } from "~/lib/use-infinite-list";
import { CoverView } from "~/components/flipbook/PageView";
import { Empty } from "~/components/explore/Empty";
import { Owner } from "~/components/explore/Owner";
import { Spinner } from "~/components/ui";
import type { Route } from "./+types/books";

export const meta = () => [
	{ title: "Explore books · Toneflix Photos" },
	{ name: "description", content: "Photo books people chose to share with everyone. Open one and turn the pages." },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);

	const { data: items, meta } = await api.explore.books({ page, per_page: 24 });

	return { items, page: meta.current_page, lastPage: meta.last_page };
}

export default function ExploreBooks({ loaderData }: Route.ComponentProps) {
	const { items: books, hasMore, loading, sentinel } = useInfiniteList(loaderData, "/explore/books");

	if (!books.length) return <Empty>No public books yet. Set a book to Public in its editor and it shows up here.</Empty>;

	return (
		<>
			<ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{books.map((book) => (
					<PublicBookCard key={book.id} book={book} />
				))}
			</ul>
			{hasMore && (
				<div ref={sentinel} className="flex h-24 items-center justify-center text-ink-500">
					{loading && <Spinner />}
				</div>
			)}
		</>
	);
}

/** A public book's cover. Opening it goes straight into the flipbook. */
function PublicBookCard({ book }: { book: PublicBook }) {
	return (
		<li className="group min-w-0">
			<Link
				to={`/books/${book.id}`}
				className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-surface-100 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
				style={{ containerType: "size" }}
				aria-label={`Open ${book.title}`}
			>
				<CoverView book={{ ...book, coverPhoto: book.coverPhoto ?? null }} />
			</Link>
			<h2 className="mt-3 truncate font-display font-bold text-ink-900">{book.title}</h2>
			<div className="mt-1 flex items-center justify-between gap-2">
				<Owner owner={book.owner} />
				<span className="shrink-0 text-sm text-ink-500">
					{book.pageCount} {book.pageCount === 1 ? "page" : "pages"}
				</span>
			</div>
		</li>
	);
}
