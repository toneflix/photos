import { data, Link } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi, PhotosApiError } from "~/lib/api.server";
import { Flipbook } from "~/components/flipbook/Flipbook";
import type { Route } from "./+types/book-view";

export function meta({ loaderData }: Route.MetaArgs) {
	const book = loaderData?.book;
	if (!book) return [{ title: "Book not found · Toneflix Photos" }];
	return [
		{ title: `${book.title} · Toneflix Photos` },
		{ name: "description", content: book.description ?? `A photo book by ${book.owner.name}.` },
		{ property: "og:title", content: book.title },
		...(book.coverPhoto ? [{ property: "og:image", content: book.coverPhoto.url }] : []),
	];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);

	try {
		const { data: book } = await api.books.get(params.id);
		return { book };
	} catch (error) {
		if (error instanceof PhotosApiError && (error.code === 404 || error.code === 422)) {
			throw data("Book not found", { status: 404 });
		}
		throw error;
	}
}

export default function BookView({ loaderData }: Route.ComponentProps) {
	const { book } = loaderData;

	return (
		<Flipbook
			book={book}
			topLeft={
				<Link
					to={book.canEdit ? "/books" : "/"}
					className="rounded-full bg-white/10 p-2 hover:bg-white/20"
					aria-label={book.canEdit ? "Back to your books" : "Toneflix Photos"}
					title={book.canEdit ? "Back to your books" : "Toneflix Photos"}
				>
					<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</Link>
			}
			topRight={
				book.canEdit ? (
					<Link to={`/books/${book.id}/edit`} className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
						Edit
					</Link>
				) : null
			}
		/>
	);
}
