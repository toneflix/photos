import { data } from "react-router";
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
