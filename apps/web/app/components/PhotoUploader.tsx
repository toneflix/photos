import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { ACCEPTED_IMAGES, MAX_PHOTO_BYTES, readImageSize } from "~/lib/images";
import { Spinner } from "./ui";

type Progress = { total: number; done: number; failed: string[] };
type Item = { key: string; preview: string; status: "waiting" | "uploading" | "done" | "failed" };

/**
 * Drag-and-drop (or pick) photos and upload them one at a time through the
 * given route action, which forwards them to the API.
 */
export function PhotoUploader({ action = "/photos", compact = false }: { action?: string; compact?: boolean }) {
	const fetcher = useFetcher();
	const input = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [progress, setProgress] = useState<Progress | null>(null);
	const [items, setItems] = useState<Item[]>([]);
	const setStatus = (key: string, status: Item["status"]) =>
		setItems((list) => list.map((it) => (it.key === key ? { ...it, status } : it)));
	const busy = !!progress && progress.done < progress.total;

	async function upload(list: FileList | File[]) {
		const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
		if (!files.length) return;

		const state: Progress = { total: files.length, done: 0, failed: [] };
		setProgress({ ...state });
		items.forEach((it) => URL.revokeObjectURL(it.preview));
		const queued: Item[] = files.map((f, i) => ({ key: `${Date.now()}-${i}`, preview: URL.createObjectURL(f), status: "waiting" }));
		setItems(queued);

		for (const [i, file] of files.entries()) {
			const key = queued[i].key;
			setStatus(key, "uploading");
			if (file.size > MAX_PHOTO_BYTES) {
				state.failed.push(`${file.name} is larger than 25 MB`);
				setStatus(key, "failed");
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
					setStatus(key, "done");
				} catch {
					state.failed.push(`${file.name} didn't upload`);
					setStatus(key, "failed");
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
			className={`rounded-xl border-2 border-dashed transition ${
				dragging ? "border-brand-500 bg-brand-500/5" : "border-surface-300 bg-white"
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
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-brand-600">
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
								<button type="button" onClick={() => input.current?.click()} className="ml-1 text-brand-600 underline underline-offset-2">
									choose files
								</button>
							)}
						</p>
					)}
					{!compact && !busy && <p className="mt-1 text-sm text-ink-500">JPEG, PNG, WebP, GIF, AVIF or HEIC, up to 25 MB each.</p>}
					{busy && (
						<div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-200">
							<div className="h-full bg-brand-500 transition-all" style={{ width: `${(progress!.done / progress!.total) * 100}%` }} />
						</div>
					)}
				</div>
				{!compact && (
					<button
						type="button"
						disabled={busy}
						onClick={() => input.current?.click()}
						className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-surface-50 hover:bg-ink-700 disabled:opacity-50"
					>
						Choose photos
					</button>
				)}
			</div>
			{items.length > 0 && (busy || !compact) && (
				<ul className={`mt-4 flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>
					{items.map((it) => (
						<li key={it.key} className="relative h-12 w-12 overflow-hidden rounded-lg bg-surface-200">
							<img src={it.preview} alt="" className={`h-full w-full object-cover transition ${it.status === "done" ? "" : "opacity-50"}`} />
							{it.status === "uploading" && (
								<span className="absolute inset-0 flex items-center justify-center text-ink-900">
									<Spinner />
								</span>
							)}
							{it.status === "done" && (
								<span className="absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
									<svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden>
										<path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
							)}
							{it.status === "failed" && <span className="absolute inset-0 bg-red-600/40" />}
						</li>
					))}
				</ul>
			)}
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
