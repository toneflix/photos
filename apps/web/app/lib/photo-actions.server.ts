import { data, redirect } from "react-router";
import type { BookPageInput, PageLayout } from "@photos/types";
import type { PhotosEndpoints } from "@photos/api-client";
import { formError } from "./api.server";

/** Shared photo actions for the library and the book editor. */
export async function handlePhotoIntent(api: PhotosEndpoints, form: FormData) {
	const intent = form.get("intent");

	try {
		if (intent === "upload") {
			const file = form.get("photo");
			if (!(file instanceof File)) return data({ ok: false as const, error: "Choose a photo to upload" }, { status: 422 });

			const num = (key: string) => {
				const n = Number(form.get(key));
				return Number.isFinite(n) && n > 0 ? n : undefined;
			};
			const { data: photo } = await api.photos.upload(file, {
				width: num("width"),
				height: num("height"),
				takenAt: String(form.get("takenAt") ?? "") || undefined,
			});
			return { ok: true as const, photo };
		}

		if (intent === "caption") {
			const { data: photo } = await api.photos.update(String(form.get("photoId")), {
				caption: String(form.get("caption") ?? "") || null,
			});
			return { ok: true as const, photo };
		}

		if (intent === "visibility") {
			const { data: photo } = await api.photos.update(String(form.get("photoId")), {
				visibility: form.get("visibility") === "public" ? "public" : "private",
			});
			return { ok: true as const, photo };
		}

		if (intent === "make-book") {
			const ids = form.getAll("photoIds").map(String).filter(Boolean);
			if (!ids.length) return data({ ok: false as const, error: "Choose some photos first" }, { status: 422 });
			const title = String(form.get("title") ?? "").trim() || "Untitled book";
			const { data: book } = await api.books.create({ title });
			await api.books.savePages(book.id, autoLayout(ids));
			return redirect(`/books/${book.id}/edit`);
		}

		if (intent === "delete") {
			await api.photos.remove(String(form.get("photoId")));
			return { ok: true as const };
		}
	} catch (error) {
		const result = formError(error);
		return data({ ok: false as const, error: result.error }, { status: result.status });
	}

	return null;
}

/** Spread photos over pages, mixing layouts so the book has rhythm. */
export function autoLayout(photoIds: string[]): BookPageInput[] {
	const pattern: [PageLayout, number][] = [
		["single", 1],
		["framed", 1],
		["pair", 2],
		["collage", 3],
		["framed", 1],
		["grid", 4],
	];
	const pages: BookPageInput[] = [];
	for (let i = 0, n = 0; i < photoIds.length; n++) {
		const [layout, count] = pattern[n % pattern.length];
		pages.push({ layout, photoIds: photoIds.slice(i, i + count) });
		i += count;
	}
	return pages;
}
