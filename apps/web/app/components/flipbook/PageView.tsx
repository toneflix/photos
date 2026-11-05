import type { BookPage, BookTheme, BookWithPages, Photo } from "@photos/types";

/**
 * Renders the inside of one book page. Sizes use container units (cqw/cqh),
 * so the same page looks right in the editor thumbnail and in a full-screen
 * spread. The parent must have `container-type: size`.
 */
export function PageView({
	page,
	number,
	side,
	showImages = true,
	onSlotClick,
	activeSlot,
}: {
	page: Pick<BookPage, "layout" | "caption" | "photos">;
	number?: number;
	side?: "left" | "right";
	showImages?: boolean;
	/** Editor only: makes each photo slot clickable. */
	onSlotClick?: (slot: number) => void;
	activeSlot?: number | null;
}) {
	const { layout, caption, photos } = page;
	const slots = layout === "grid" ? 4 : layout === "pair" ? 2 : 1;

	const slot = (index: number, className: string, fit: "cover" | "framed" = "cover") => {
		const photo = photos[index];
		const editable = !!onSlotClick;
		const active = editable && activeSlot === index;

		return (
			<div
				key={index}
				className={`${className.includes("absolute") ? "" : "relative"} ${fit === "framed" ? "" : "overflow-hidden"} ${className} ${
					editable ? "cursor-pointer" : ""
				} ${active ? "ring-[0.8cqw] ring-ember-500 ring-offset-0" : ""}`}
				onClick={editable ? () => onSlotClick(index) : undefined}
				role={editable ? "button" : undefined}
				aria-label={editable ? `Photo slot ${index + 1}` : undefined}
			>
				{photo && fit === "framed" ? (
					<div className="flex h-full w-full items-center justify-center">
						{showImages ? (
							<img
								src={photo.url}
								alt={photo.caption ?? ""}
								draggable={false}
								decoding="async"
								width={photo.width ?? undefined}
								height={photo.height ?? undefined}
								className="h-auto max-h-full w-auto max-w-full bg-white object-contain p-[2.4cqw] shadow-[0_0.6cqw_2cqw_rgb(0_0_0/0.2)] select-none"
							/>
						) : (
							<div className="aspect-[4/3] w-full bg-paper-200" />
						)}
					</div>
				) : photo ? (
					<PhotoImage photo={photo} show={showImages} />
				) : (
					<div
						className={`flex h-full w-full items-center justify-center bg-paper-200/70 text-ink-500 ${
							editable ? "border-[0.4cqw] border-dashed border-paper-300" : ""
						}`}
						style={{ fontSize: "3.2cqw" }}
					>
						{editable ? "Add a photo" : ""}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="paper absolute inset-0 flex flex-col text-ink-700">
			{layout === "single" && (
				<>
					{slot(0, "absolute inset-0")}
					{caption && (
						<div
							className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent font-serif text-white italic"
							style={{ padding: "14cqw 7cqw 7cqw", fontSize: "4.2cqw", lineHeight: 1.35 }}
						>
							{caption}
						</div>
					)}
				</>
			)}

			{layout === "framed" && (
				<div className="flex h-full flex-col" style={{ padding: "10cqw 9cqw 6cqw" }}>
					<div className="relative min-h-0 flex-1">{slot(0, "h-full w-full", "framed")}</div>
					<p
						className="text-center font-serif text-ink-700 italic"
						style={{ marginTop: "5cqw", fontSize: "4.2cqw", minHeight: "6cqw", lineHeight: 1.35 }}
					>
						{caption}
					</p>
				</div>
			)}

			{layout === "pair" && (
				<div className="flex h-full flex-col" style={{ padding: "7cqw", gap: "4cqw" }}>
					{slot(0, "flex-1 shadow-[0_0.4cqw_1.4cqw_rgb(0_0_0/0.15)]")}
					{slot(1, "flex-1 shadow-[0_0.4cqw_1.4cqw_rgb(0_0_0/0.15)]")}
					{caption && (
						<p className="text-center font-serif italic" style={{ fontSize: "3.8cqw" }}>
							{caption}
						</p>
					)}
				</div>
			)}

			{layout === "grid" && (
				<div className="flex h-full flex-col" style={{ padding: "7cqw", gap: "3cqw" }}>
					<div className="grid flex-1 grid-cols-2 grid-rows-2" style={{ gap: "3cqw" }}>
						{Array.from({ length: slots }, (_, i) => slot(i, "shadow-[0_0.4cqw_1.4cqw_rgb(0_0_0/0.15)]"))}
					</div>
					{caption && (
						<p className="text-center font-serif italic" style={{ fontSize: "3.8cqw" }}>
							{caption}
						</p>
					)}
				</div>
			)}

			{number !== undefined && layout !== "single" && (
				<span
					className={`absolute bottom-0 font-serif text-ink-500 ${side === "left" ? "left-0" : "right-0"}`}
					style={{ padding: "0 5cqw 2.6cqw", fontSize: "2.8cqw" }}
				>
					{number}
				</span>
			)}
		</div>
	);
}

export function PhotoImage({
	photo,
	fit = "cover",
	show = true,
	className = "",
}: {
	photo: Photo;
	fit?: "cover" | "contain";
	show?: boolean;
	className?: string;
}) {
	if (!show) return <div className={`h-full w-full bg-paper-200 ${className}`} />;

	return (
		<img
			src={photo.url}
			alt={photo.caption ?? ""}
			draggable={false}
			decoding="async"
			width={photo.width ?? undefined}
			height={photo.height ?? undefined}
			className={`h-full w-full select-none ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
		/>
	);
}

const themeClass: Record<BookTheme, string> = {
	classic: "cover-classic",
	linen: "cover-linen",
	midnight: "cover-midnight",
};

/** The front cover: cloth/leather with the title and an inset photo. */
export function CoverView({
	book,
	showImages = true,
}: {
	book: Pick<BookWithPages, "title" | "description" | "theme" | "coverPhoto">;
	showImages?: boolean;
}) {
	return (
		<div className={`absolute inset-0 ${themeClass[book.theme] ?? themeClass.classic}`}>
			{/* Spine hinge */}
			<div className="absolute inset-y-0 left-0 w-[4cqw] bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
			<div
				className="absolute flex flex-col items-center border border-current/40 text-center"
				style={{ inset: "6cqw", padding: "8cqw 6cqw" }}
			>
				<p className="tracking-[0.3em] uppercase opacity-70" style={{ fontSize: "2.6cqw" }}>
					A Toneflix photo book
				</p>
				<h1
					className="font-serif font-medium"
					style={{ marginTop: "5cqw", fontSize: "9cqw", lineHeight: 1.05, textWrap: "balance" }}
				>
					{book.title}
				</h1>
				{book.coverPhoto && (
					<div
						className="relative w-full flex-1 overflow-hidden border-[0.8cqw] border-current/60 shadow-[inset_0_0_2cqw_rgb(0_0_0/0.4)]"
						style={{ marginTop: "7cqw", maxHeight: "62%" }}
					>
						<PhotoImage photo={book.coverPhoto} show={showImages} />
					</div>
				)}
				{!book.coverPhoto && book.description && (
					<p className="font-serif italic opacity-80" style={{ marginTop: "6cqw", fontSize: "4cqw" }}>
						{book.description}
					</p>
				)}
			</div>
		</div>
	);
}

/** The back cover. */
export function BackCoverView({ theme }: { theme: BookTheme }) {
	return (
		<div className={`absolute inset-0 ${themeClass[theme] ?? themeClass.classic}`}>
			<div className="absolute inset-y-0 right-0 w-[4cqw] bg-gradient-to-l from-black/35 via-black/10 to-transparent" />
			<div className="absolute inset-x-0 bottom-[10cqw] text-center">
				<Monogram />
				<p className="mt-[2cqw] tracking-[0.3em] uppercase opacity-60" style={{ fontSize: "2.4cqw" }}>
					Toneflix Photos
				</p>
			</div>
		</div>
	);
}

/** Inside the front cover: a title page. */
export function TitlePageView({
	book,
}: {
	book: Pick<BookWithPages, "title" | "description" | "owner" | "createdAt">;
}) {
	const year = new Date(book.createdAt).getFullYear();

	return (
		<div className="paper absolute inset-0 flex flex-col items-center justify-center text-center text-ink-700" style={{ padding: "12cqw" }}>
			<Monogram />
			<h2 className="font-serif text-ink-900" style={{ marginTop: "6cqw", fontSize: "7.5cqw", lineHeight: 1.1, textWrap: "balance" }}>
				{book.title}
			</h2>
			{book.description && (
				<p className="font-serif italic" style={{ marginTop: "4cqw", fontSize: "4cqw", lineHeight: 1.45 }}>
					{book.description}
				</p>
			)}
			<div className="bg-ink-500/40" style={{ marginTop: "7cqw", height: "1px", width: "20cqw" }} />
			<p className="tracking-[0.2em] uppercase" style={{ marginTop: "5cqw", fontSize: "2.6cqw" }}>
				{book.owner.name ? `${book.owner.name} · ${year}` : year}
			</p>
		</div>
	);
}

/** Inside the back cover. */
export function ColophonView() {
	return (
		<div className="paper absolute inset-0 flex flex-col items-center justify-end text-center text-ink-500" style={{ padding: "12cqw" }}>
			<p className="font-serif italic" style={{ fontSize: "3.6cqw" }}>
				Preserved for all time with Toneflix Photos.
			</p>
		</div>
	);
}

export function BlankPageView() {
	return <div className="paper absolute inset-0" />;
}

function Monogram() {
	return (
		<svg viewBox="0 0 40 40" className="mx-auto" style={{ width: "9cqw", height: "9cqw" }} aria-hidden>
			<circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeOpacity="0.6" />
			<path d="M12 14h16M20 14v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
			<circle cx="27" cy="25" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
		</svg>
	);
}
