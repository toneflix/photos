import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useFetcher, useLocation, useNavigate } from "react-router";
import type { PublicPhoto, PublicPhotoDetail } from "@photos/types";
import { PhotoView } from "~/components/explore/PhotoView";
import { Spinner } from "~/components/ui";
import { PhotoDialog, PhotoDialogHost } from "~/lib/photo-dialog";
import { arrowMove, type SwipeMoves } from "~/lib/swipe";

type PhotoPage = { photo: PublicPhotoDetail; more: PublicPhoto[] };

/**
 * The photo opened from a list, filling the page below the header with the list kept underneath.
 * Swiping the photo, or the arrow keys, move to the photos beside it in that list.
 */
export function ExplorePhotoDialog() {
	const location = useLocation();
	const navigate = useNavigate();
	const fetcher = useFetcher<PhotoPage>();
	const scroller = useRef<HTMLDivElement>(null);
	const id = PhotoDialog.id(location);
	const depth = PhotoDialog.depth(location);
	const shown = fetcher.data?.photo.id === id ? fetcher.data : undefined;
	const trail = useContext(PhotoDialogHost);
	const beside = id ? trail?.beside(id) : undefined;
	const previousId = beside?.previous?.id;
	const nextId = beside?.next?.id;

	const moves = useMemo<SwipeMoves>(() => {
		const to = (target?: string) => (target ? () => navigate(...PhotoDialog.swap(location, target)) : undefined);

		return { previous: to(previousId), next: to(nextId) };
	}, [location, navigate, previousId, nextId]);

	const close = useCallback(() => {
		if (depth > 0) navigate(-depth);
		else navigate(PhotoDialog.underneath(location), { replace: true, preventScrollReset: true });
	}, [depth, location, navigate]);

	useEffect(() => {
		if (id) fetcher.load(`/explore/photos/${id}`);
	}, [id]);

	useEffect(() => {
		scroller.current?.scrollTo({ top: 0 });
	}, [shown]);

	useEffect(() => {
		for (const photo of [beside?.previous, beside?.next]) if (photo) new Image().src = photo.url;
	}, [beside?.previous, beside?.next]);

	useEffect(() => {
		if (!id) return;

		const root = document.documentElement;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
			else arrowMove(event, moves);
		};

		root.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);

		return () => {
			root.style.overflow = "";
			window.removeEventListener("keydown", onKey);
		};
	}, [id, close, moves]);

	if (!id) return null;

	return (
		<div
			ref={scroller}
			role="dialog"
			aria-modal
			aria-label={shown?.photo.caption ?? "Photo"}
			className="fixed inset-x-0 bottom-0 top-[var(--header-height)] z-30 overflow-y-auto overscroll-contain bg-canvas [--photo-height:calc(100dvh-var(--header-height))] [--photo-top:0px]"
		>
			{shown ? (
				<PhotoView photo={shown.photo} more={shown.more} onClose={close} moves={moves} />
			) : (
				<div className="flex h-full items-center justify-center text-ink-500">
					<Spinner className="h-6 w-6" />
				</div>
			)}
		</div>
	);
}
