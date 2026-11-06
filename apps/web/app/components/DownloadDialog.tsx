import { useEffect, useState } from "react";
import type { Photo, PhotoDownloadPreset } from "@photos/types";
import { buttonClass } from "~/components/ui";

const LABELS: Record<PhotoDownloadPreset, string> = {
	original: "Original",
	large: "Large",
	medium: "Medium",
	small: "Small",
};

type Choice = PhotoDownloadPreset | "custom";

/**
 * Pick a size before downloading a photo: the original, a smaller preset, or custom dimensions.
 * With "Keep the photo's shape" on, only the width is sent and the height follows it; off, the photo
 * is cropped from the centre to the exact size.
 */
export function DownloadDialog({ photo, href, onClose }: { photo: Pick<Photo, "downloads" | "width" | "height">; href: string; onClose: () => void }) {
	const original = photo.downloads[0];
	const [choice, setChoice] = useState<Choice>("original");
	const [width, setWidth] = useState(original?.width || 1920);
	const [height, setHeight] = useState(original?.height || 1280);
	const [keepShape, setKeepShape] = useState(true);
	const ratio = original?.width && original.height ? original.height / original.width : null;
	const shapeLocked = keepShape && !!ratio;
	const customHeight = shapeLocked ? Math.max(1, Math.round(width * ratio!)) : height;

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;

			event.stopImmediatePropagation();
			onClose();
		};

		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [onClose]);

	const query =
		choice === "original"
			? ""
			: choice === "custom"
				? `?${new URLSearchParams(shapeLocked ? { width: String(width) } : { width: String(width), height: String(height) })}`
				: `?size=${choice}`;

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/60 p-4 sm:items-center" onClick={onClose}>
			<div
				role="dialog"
				aria-modal
				aria-label="Download"
				className="w-full max-w-md rounded-2xl bg-white p-6 text-ink-900 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-display text-xl font-bold">Choose a size</h2>
					<button type="button" onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-surface-100" aria-label="Close">
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
						</svg>
					</button>
				</div>

				<fieldset className="space-y-2">
					<legend className="sr-only">Size</legend>
					{photo.downloads.map((option) => (
						<SizeOption key={option.size} value={option.size} checked={choice === option.size} onChange={setChoice} label={LABELS[option.size]}>
							{option.width && option.height ? `${option.width} × ${option.height}` : "Full size"}
						</SizeOption>
					))}
					{ratio && (
						<SizeOption value="custom" checked={choice === "custom"} onChange={setChoice} label="Custom size">
							Your own width and height
						</SizeOption>
					)}
				</fieldset>

				{choice === "custom" && (
					<div className="mt-4 rounded-xl bg-surface-100 p-4">
						<div className="flex items-end gap-3">
							<Dimension label="Width" value={width} max={original?.width} onChange={setWidth} />
							<span className="pb-3 text-ink-500" aria-hidden>
								×
							</span>
							<Dimension label="Height" value={customHeight} max={original?.height} onChange={setHeight} disabled={shapeLocked} />
						</div>
						<label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink-700">
							<input type="checkbox" checked={keepShape} onChange={(event) => setKeepShape(event.target.checked)} className="h-4 w-4 accent-brand-600" />
							Keep the photo's shape
						</label>
						<p className="mt-2 text-xs text-ink-500">
							{keepShape ? "The height follows the width." : "The photo is cropped from the centre to this size."} Photos are never made larger than the
							original.
						</p>
					</div>
				)}

				<a href={`${href}${query}`} download onClick={onClose} className={buttonClass("primary", "mt-6 w-full py-3")}>
					Download
				</a>
			</div>
		</div>
	);
}

function SizeOption({
	value,
	checked,
	onChange,
	label,
	children,
}: {
	value: Choice;
	checked: boolean;
	onChange: (value: Choice) => void;
	label: string;
	children: string;
}) {
	return (
		<label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-[1.5px] border-surface-300 px-4 py-3 transition hover:border-ink-500 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
			<span className="flex items-center gap-3 text-sm font-semibold text-ink-900">
				<input type="radio" name="size" value={value} checked={checked} onChange={() => onChange(value)} className="accent-brand-600" />
				{label}
			</span>
			<span className="text-sm text-ink-500">{children}</span>
		</label>
	);
}

function Dimension({
	label,
	value,
	max,
	onChange,
	disabled,
}: {
	label: string;
	value: number;
	max?: number;
	onChange: (value: number) => void;
	disabled?: boolean;
}) {
	return (
		<label className="block flex-1">
			<span className="mb-1.5 block text-xs font-semibold text-ink-700">{label}</span>
			<input
				type="number"
				min={1}
				max={max || undefined}
				value={value}
				disabled={disabled}
				onChange={(event) => onChange(Math.max(1, Math.round(Number(event.target.value)) || 1))}
				className="field w-full px-3 py-2.5 text-sm disabled:opacity-60"
			/>
		</label>
	);
}
