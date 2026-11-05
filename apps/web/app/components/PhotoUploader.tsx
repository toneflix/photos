import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { ACCEPTED_IMAGES, MAX_PHOTO_BYTES, readImageSize } from "~/lib/images";
import { Spinner } from "./ui";

type Progress = { total: number; done: number; failed: string[] };

/**
 * Drag-and-drop (or pick) photos and upload them one at a time through the
 * given route action, which forwards them to the API.
 */
export function PhotoUploader({ action = "/photos", compact = false }: { action?: string; compact?: boolean }) {
	const fetcher = useFetcher();
	const input = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [progress, setProgress] = useState<Progress | null>(null);
	const busy = !!progress && progress.done < progress.total;

	async function upload(list: FileList | File[]) {
		const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
		if (!files.length) return;

		const state: Progress = { total: files.length, done: 0, failed: [] };
		setProgress({ ...state });

		for (const file of files) {
			if (file.size > MAX_PHOTO_BYTES) {
				state.failed.push(`${file.name} is larger than 25 MB`);
			} else {
				const size = await readImageSize(file);
				const form = new FormData();
				form.set("intent", "upload");
				form.set("photo", file, file.name);
				if (size) {
					form.set("width", String(size.width));
					form.set("height", String(size.height));
				}
				if (file.lastModified) form.set("takenAt", new Date(file.lastModified).toISOString());

				try {
					await fetcher.submit(form, { method: "post", action, encType: "multipart/form-data" });
				} catch {
					state.failed.push(`${file.name} didn't upload`);
				}
			}
			state.done += 1;
			setProgress({ ...state, failed: [...state.failed] });
		}
	}

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				if (!busy) upload(e.dataTransfer.files);
			}}
			className={`rounded-2xl border-2 border-dashed transition ${
				dragging ? "border-ember-500 bg-ember-500/5" : "border-paper-300 bg-white"
			} ${compact ? "p-4" : "p-8 sm:p-10"}`}
		>
			<input
				ref={input}
				type="file"
				accept={ACCEPTED_IMAGES}
				multiple
				className="sr-only"
				onChange={(e) => {
					if (e.target.files) upload(e.target.files);
					e.target.value = "";
				}}
			/>
			<div className={`flex items-center gap-4 ${compact ? "flex-row" : "flex-col text-center"}`}>
				{!compact && (
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-100 text-ember-600">
						<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
							<path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</div>
				)}
				<div className={compact ? "flex-1 text-sm" : ""}>
					{busy ? (
						<p className="flex items-center gap-2 font-medium text-ink-900">
							<Spinner /> Uploading {progress!.done + 1} of {progress!.total}…
						</p>
					) : (
						<p className={`font-medium text-ink-900 ${compact ? "" : "text-lg"}`}>
							{compact ? "Drop photos here or" : "Drop your photos here"}
							{compact && (
								<button type="button" onClick={() => input.current?.click()} className="ml-1 text-ember-600 underline underline-offset-2">
									choose files
								</button>
							)}
						</p>
					)}
					{!compact && !busy && <p className="mt-1 text-sm text-ink-500">JPEG, PNG, WebP, GIF, AVIF or HEIC, up to 25 MB each.</p>}
					{busy && (
						<div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-paper-200">
							<div className="h-full bg-ember-500 transition-all" style={{ width: `${(progress!.done / progress!.total) * 100}%` }} />
						</div>
					)}
				</div>
				{!compact && (
					<button
						type="button"
						disabled={busy}
						onClick={() => input.current?.click()}
						className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-paper-50 hover:bg-ink-700 disabled:opacity-50"
					>
						Choose photos
					</button>
				)}
			</div>
			{progress && !busy && (
				<p className={`mt-3 text-sm ${progress.failed.length ? "text-red-700" : "text-emerald-700"} ${compact ? "" : "text-center"}`}>
					{progress.failed.length
						? `${progress.total - progress.failed.length} uploaded. ${progress.failed.join(". ")}.`
						: `${progress.total} ${progress.total === 1 ? "photo" : "photos"} uploaded.`}
				</p>
			)}
		</div>
	);
}
