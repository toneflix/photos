/** Tones for the stand-in photos, from warm daylight to dusk. */
const TILES = [
	"from-amber-200 via-orange-300 to-rose-400",
	"from-sky-300 via-cyan-200 to-teal-300",
	"from-emerald-200 via-lime-200 to-yellow-200",
	"from-violet-300 via-fuchsia-200 to-pink-300",
	"from-orange-200 via-amber-300 to-yellow-500",
	"from-slate-400 via-sky-500 to-indigo-600",
	"from-rose-200 via-pink-300 to-red-300",
	"from-teal-300 via-emerald-400 to-green-600",
	"from-yellow-100 via-orange-200 to-amber-400",
	"from-indigo-300 via-purple-300 to-pink-200",
	"from-stone-300 via-amber-200 to-orange-300",
	"from-cyan-200 via-sky-300 to-blue-400",
];

const HEIGHTS = ["h-40", "h-56", "h-48", "h-64", "h-44", "h-52"];

/** A masonry wall of soft colour blocks that stands in for photos behind heroes. */
export function Mosaic({ columns = 5, className = "" }: { columns?: number; className?: string }) {
	return (
		<div className={`flex gap-3 ${className}`} aria-hidden>
			{Array.from({ length: columns }, (_, column) => (
				<div key={column} className={`flex flex-1 flex-col gap-3 ${column % 2 ? "-mt-16" : ""}`}>
					{Array.from({ length: 4 }, (_, row) => {
						const index = column * 4 + row;

						return <div key={row} className={`${HEIGHTS[(index * 5) % HEIGHTS.length]} shrink-0 rounded-lg bg-gradient-to-br ${TILES[(index * 7) % TILES.length]}`} />;
					})}
				</div>
			))}
		</div>
	);
}
