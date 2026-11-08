import { createContext, useContext } from "react";
import { useLocation, type Location, type LinkProps, type NavigateOptions, type ShouldRevalidateFunctionArgs, type To } from "react-router";
import type { PublicPhoto } from "@photos/types";

/** The photos of the list the open photo came from, in the order the list shows them. */
export class PhotoTrail {
	private photos: PublicPhoto[] = [];

	/** Remembers the list before one of its photos opens. */
	follow(photos: PublicPhoto[]) {
		this.photos = photos;
	}

	/** The photos just before and after `id` in its list. */
	beside(id: string): { previous?: PublicPhoto; next?: PublicPhoto } {
		const index = this.photos.findIndex((photo) => photo.id === id);

		if (index < 0) return {};

		return { previous: this.photos[index - 1], next: this.photos[index + 1] };
	}
}

/** Set inside a layout that shows Explore photos in a dialog over the page. */
export const PhotoDialogHost = createContext<PhotoTrail | null>(null);

/**
 * Explore photos opened from a list: the page stays underneath with `?photo=<id>`,
 * while the address bar shows the photo's own page.
 */
export class PhotoDialog {
	static readonly param = "photo";

	/** The photo the dialog shows, if one is open. */
	static id(location: Location): string | null {
		return new URLSearchParams(location.search).get(PhotoDialog.param);
	}

	/** How many photos were opened since the page underneath, so closing returns to it. */
	static depth(location: Location): number {
		return Number(location.state?.photoDepth) || 0;
	}

	/** Link props that open a photo in the dialog, or its page when no dialog is hosted. */
	static link(location: Location, id: string, hosted: boolean): Pick<LinkProps, "to" | "mask" | "state" | "preventScrollReset"> {
		const page = `/explore/photos/${id}`;

		if (!hosted) return { to: page };

		const search = new URLSearchParams(location.search);

		search.set(PhotoDialog.param, id);

		return {
			to: { pathname: location.pathname, search: `?${search}` },
			mask: page,
			state: { photoDepth: PhotoDialog.depth(location) + 1 },
			preventScrollReset: true,
		};
	}

	/** Navigation that swaps the open photo for another from its list, so closing still returns to the page underneath. */
	static swap(location: Location, id: string): [To, NavigateOptions] {
		const { to, mask, state } = PhotoDialog.link(location, id, true);

		return [to, { mask, state: { photoDepth: PhotoDialog.depth(location) }, replace: true, preventScrollReset: true }];
	}

	/** The page underneath, without the open photo. */
	static underneath(location: Location): string {
		const search = new URLSearchParams(location.search);

		search.delete(PhotoDialog.param);

		const query = search.toString();

		return query ? `${location.pathname}?${query}` : location.pathname;
	}

	/** Keeps a page's data while only the open photo changes. */
	static shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs): boolean {
		const current = new URL(currentUrl);
		const next = new URL(nextUrl);
		const photoChanged = current.searchParams.get(PhotoDialog.param) !== next.searchParams.get(PhotoDialog.param);

		current.searchParams.delete(PhotoDialog.param);
		next.searchParams.delete(PhotoDialog.param);

		if (photoChanged && current.href === next.href) return false;

		return defaultShouldRevalidate;
	}
}

/** Link props for a photo in a list. Opening one in the dialog lets it move through `photos`. */
export function usePhotoLink(photos: PublicPhoto[]) {
	const location = useLocation();
	const trail = useContext(PhotoDialogHost);

	return (id: string): Pick<LinkProps, "to" | "mask" | "state" | "preventScrollReset" | "onClick"> => ({
		...PhotoDialog.link(location, id, !!trail),
		onClick: () => trail?.follow(photos),
	});
}
