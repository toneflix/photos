import type { ModeratedKind, ModerationItem } from "@photos/types";

/** The kinds of public work admins look after, each with its own sidebar page. */
export const CONTENT_KINDS: { kind: ModeratedKind; label: string; one: string; icon: string; downloads: boolean }[] = [
	{ kind: "photos", label: "Photos", one: "photo", icon: "image", downloads: true },
	{ kind: "books", label: "Books", one: "book", icon: "book", downloads: true },
	{ kind: "spaces", label: "Spaces", one: "space", icon: "grid", downloads: false },
];

/** The kind a URL like /admin/books/… is about. */
export function contentKind(url: string) {
	const segment = new URL(url).pathname.split("/")[2];

	return CONTENT_KINDS.find((entry) => entry.kind === segment) ?? CONTENT_KINDS[0];
}

/** Where an item lives in the app, for opening it as visitors see it. */
export function publicLink(item: Pick<ModerationItem, "kind" | "id">, slug?: string) {
	if (item.kind === "photo") return `/explore/photos/${item.id}`;
	if (item.kind === "book") return `/books/${item.id}`;

	return slug ? `/spaces/${slug}` : null;
}
