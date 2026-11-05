import { createContext, type CSSProperties } from "react";
import type { FrameStyle, Photo } from "@photos/types";

/** The frame a book gives pages that don't choose their own. Set it once around the pages. */
export const FrameContext = createContext<FrameStyle>("none");

/** Frames printed as a patterned band around a mat. */
const BANDED: FrameStyle[] = ["watercolor", "arcs", "gilt", "woodgrain"];

/**
 * A photo printed on a page inside its frame. It fills its parent, or with `fit="contain"`
 * keeps the photo's shape and centres it. Frame sizes follow the page width, times `scale`.
 */
export function PrintedPhoto({
	photo,
	frame,
	fit = "cover",
	show = true,
	scale = 1,
}: {
	photo: Photo | null;
	frame: FrameStyle;
	fit?: "cover" | "contain";
	show?: boolean;
	scale?: number;
}) {
	const ratio = photo?.width && photo.height ? photo.width / photo.height : 4 / 3;
	const style = fit === "contain" ? ({ "--ratio": ratio } as CSSProperties) : undefined;

	return (
		<div className="print-frame-box" style={{ fontSize: `${scale}cqw` }}>
			<div className={`print-frame frame-${frame} ${fit === "contain" ? "is-contained" : ""}`} style={style}>
				{BANDED.includes(frame) && <span className="print-frame-band" aria-hidden />}
				{photo && show ? (
					<img
						src={photo.url}
						alt={photo.caption ?? ""}
						draggable={false}
						decoding="async"
						width={photo.width ?? undefined}
						height={photo.height ?? undefined}
						className="print-photo print-frame-photo select-none"
					/>
				) : (
					<div className="print-frame-photo bg-current/15" />
				)}
				{frame === "corners" && ["tl", "tr", "bl", "br"].map((corner) => <span key={corner} className={`print-frame-corner is-${corner}`} aria-hidden />)}
				{frame === "botanical" && ["tl", "br"].map((corner) => <Sprig key={corner} corner={corner} />)}
			</div>
		</div>
	);
}

/** Leaves along a stem, alternating sides and shrinking toward the tip. */
const LEAVES = [14, 24, 34, 44, 54, 64, 74].map((x, i) => ({ x, angle: i % 2 ? 38 : -38, length: 26 - i * 2 }));

/** A sprig of leaves drawn in ink like a pen sketch, its stem along the frame rule. */
function Sprig({ corner }: { corner: string }) {
	return (
		<svg viewBox="0 0 100 40" className={`print-frame-sprig is-${corner}`} fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
			<path d="M4 20 Q 50 17, 92 20" strokeWidth="1.2" />
			{LEAVES.map(({ x, angle, length }) => (
				<g key={x} transform={`translate(${x} 20) rotate(${angle}) scale(${length / 20})`}>
					<path d="M0 0 C 5 -5, 14 -5, 20 0 C 14 5, 5 5, 0 0 Z" strokeWidth="1" />
					<path d="M2 0 L 16 0" strokeWidth="0.6" />
				</g>
			))}
		</svg>
	);
}
