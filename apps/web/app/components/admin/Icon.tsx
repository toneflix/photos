/** Line icons for the admin dashboard, drawn on a 24px grid. */
const PATHS: Record<string, string> = {
	gauge: "M12 14l3.5-3.5M4.6 18a9 9 0 1 1 14.8 0",
	users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.75",
	shield: "M12 21s7-3.5 7-9V5l-7-2.5L5 5v7c0 5.5 7 9 7 9z",
	sliders: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4",
	back: "M19 12H5M11 18l-6-6 6-6",
	upload: "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
	image: "M4 5h16v14H4zM4 16l4.5-4.5 4 4 2.5-2.5L20 18M15.5 9.5h.01",
	lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
	book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10",
	key: "M14.5 9.5a4 4 0 1 0-3.9 3.1L4 19.2V21h3v-2h2v-2h2l1.6-1.6a4 4 0 0 0 1.9-5.9zM16 8h.01",
	plus: "M12 5v14M5 12h14",
	tag: "M3 12V4h8l9 9-8 8zM7.5 7.5h.01",
	globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3",
	chevron: "M9 6l6 6-6 6",
	grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
	eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
	download: "M12 4v12M7 11l5 5 5-5M4 20h16",
	search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4",
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<path d={PATHS[name] ?? PATHS.sliders} />
		</svg>
	);
}
