import { useCallback, useEffect, useRef } from "react";
import { useFetcher, useLocation, useNavigate } from "react-router";
import type { PublicPhoto, PublicPhotoDetail } from "@photos/types";
import { PhotoView } from "~/components/explore/PhotoView";
import { Spinner } from "~/components/ui";
import { PhotoDialog } from "~/lib/photo-dialog";

type PhotoPage = { photo: PublicPhotoDetail; more: PublicPhoto[] };

/** The photo opened from a list, filling the page below the header with the list kept underneath. */
export function ExplorePhotoDialog() {
	const location = useLocation();
	const navigate = useNavigate();
	const fetcher = useFetcher<PhotoPage>();
	const scroller = useRef<HTMLDivElement>(null);
	const id = PhotoDialog.id(location);
	const depth = PhotoDialog.depth(location);
	const shown = fetcher.data?.photo.id === id ? fetcher.data : undefined;

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
		if (!id) return;

		const root = document.documentElement;
		const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();

		root.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);

		return () => {
			root.style.overflow = "";
			window.removeEventListener("keydown", onKey);
		};
	}, [id, close]);

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
				<PhotoView photo={shown.photo} more={shown.more} onClose={close} />
			) : (
				<div className="flex h-full items-center justify-center text-ink-500">
					<Spinner className="h-6 w-6" />
				</div>
			)}
		</div>
	);
}
