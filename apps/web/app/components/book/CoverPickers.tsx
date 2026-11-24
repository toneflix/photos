import { COVER_DESIGNS, COVER_THEMES, FlipbookModel, pageAspect, type Book, type BookTheme, type CoverDesign } from "@photos/types";
import { CoverView } from "@toneflix/flipbook-react";

/** Radio chips for the cover cloth, each with a swatch of the cloth and its ink. */
export function ClothPicker({ value, onChange, name }: { value: BookTheme; onChange: (theme: BookTheme) => void; name?: string }) {
	return (
		<fieldset>
			<legend className="mb-1.5 text-sm font-medium text-ink-700">Cloth</legend>
			<div className="flex flex-wrap gap-2">
				{(Object.keys(COVER_THEMES) as BookTheme[]).map((theme) => (
					<label
						key={theme}
						className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] py-1.5 pr-3.5 pl-1.5 text-sm font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-brand-600 ${
							value === theme
								? "border-brand-700 bg-brand-600 text-white"
								: "border-surface-300 bg-white hover:border-ink-500"
						}`}
					>
						<input type="radio" name={name} value={theme} checked={value === theme} onChange={() => onChange(theme)} className="sr-only" />
						<span
							className="h-5 w-5 rounded-full border-2 shadow-inner"
							style={{ background: COVER_THEMES[theme].cloth, borderColor: COVER_THEMES[theme].ink }}
							aria-hidden
						/>
						{COVER_THEMES[theme].label}
					</label>
				))}
			</div>
		</fieldset>
	);
}

type CoverLook = Pick<Book, "title" | "description" | "theme" | "coverDesign" | "coverText" | "coverPhoto"> & Partial<Pick<Book, "pageShape">>;

/** Every cover design as a small cover of this book. */
export function CoverDesignPicker({ book, onChange }: { book: CoverLook; onChange: (design: CoverDesign) => void }) {
	return (
		<fieldset>
			<legend className="mb-1.5 text-sm font-medium text-ink-700">Cover design</legend>
			<div className="grid grid-cols-3 gap-3" role="radiogroup">
				{(Object.keys(COVER_DESIGNS) as CoverDesign[]).map((design) => (
					<button
						key={design}
						type="button"
						role="radio"
						aria-checked={book.coverDesign === design}
						onClick={() => onChange(design)}
						title={COVER_DESIGNS[design].description}
						className="group flex flex-col items-center gap-1.5"
					>
						<span
							className={`relative block w-full overflow-hidden rounded-r-sm shadow-md ring-2 ring-offset-2 transition ${
								book.coverDesign === design ? "ring-brand-500" : "ring-transparent group-hover:ring-surface-300"
							}`}
							style={{ aspectRatio: pageAspect(book.pageShape), containerType: "size" }}
						>
							<CoverView book={FlipbookModel.cover({ ...book, coverDesign: design, coverText: book.coverDesign === design ? book.coverText : null })} />
						</span>
						<span className={`text-xs leading-tight ${book.coverDesign === design ? "font-medium text-ink-900" : "text-ink-500"}`}>
							{COVER_DESIGNS[design].label}
						</span>
					</button>
				))}
			</div>
			<p className="mt-2 text-xs text-ink-500">{COVER_DESIGNS[book.coverDesign].description}.</p>
		</fieldset>
	);
}
