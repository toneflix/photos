import { PHOTO_ZOOM, PhotoCrop, type PhotoPosition } from "@photos/types";

/** A stored position: null when the photo is centred at no zoom. */
export const storedPosition = (position: Partial<PhotoPosition> | null): PhotoPosition | null => {
	const crop = PhotoCrop.of(position);

	return crop.isCentred ? null : crop.toJSON();
};

/**
 * Zoom and centre controls for a photo whose part on show is chosen by dragging it where it is printed.
 */
export function PhotoPositionControls({
	position,
	onChange,
	hint,
}: {
	position: PhotoPosition | null;
	onChange: (position: PhotoPosition | null) => void;
	hint: string;
}) {
	const crop = PhotoCrop.of(position);

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
			<p className="min-w-48 flex-1 text-ink-500">{hint}</p>
			<label className="flex items-center gap-2 text-ink-700">
				<span>Zoom</span>
				<input
					type="range"
					min={PHOTO_ZOOM.min}
					max={PHOTO_ZOOM.max}
					step={0.05}
					value={crop.zoom}
					onChange={(e) => onChange(storedPosition(crop.zoomTo(Number(e.target.value))))}
					className="w-28 accent-brand-600"
				/>
			</label>
			<button
				type="button"
				onClick={() => onChange(null)}
				disabled={crop.isCentred}
				className="font-medium text-brand-700 hover:underline disabled:text-ink-500 disabled:no-underline"
			>
				Centre
			</button>
		</div>
	);
}
