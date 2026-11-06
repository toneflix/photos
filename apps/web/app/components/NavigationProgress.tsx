import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

type Phase = "idle" | "loading" | "done";

const PHASE_CLASS: Record<Phase, string> = {
	idle: "scale-x-0 opacity-0 transition-none",
	loading: "scale-x-90 opacity-100 transition-transform duration-[8s] ease-[cubic-bezier(0.1,0.7,0.3,1)]",
	done: "scale-x-100 opacity-0 transition-[scale,opacity] duration-300",
};

/** A thin bar across the top of the page while the next page or a form submission loads. */
export function NavigationProgress() {
	const busy = useNavigation().state !== "idle";
	const [phase, setPhase] = useState<Phase>("idle");

	useEffect(() => {
		if (busy) {
			const show = setTimeout(() => setPhase("loading"), 100);

			return () => clearTimeout(show);
		}

		setPhase((current) => (current === "loading" ? "done" : "idle"));
	}, [busy]);

	useEffect(() => {
		if (phase !== "done") return;

		const hide = setTimeout(() => setPhase("idle"), 300);

		return () => clearTimeout(hide);
	}, [phase]);

	return (
		<div role="progressbar" aria-label="Loading" aria-hidden={phase !== "loading"} className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
			<div className={`bg-brand-sweep h-full origin-left shadow-[0_0_8px_var(--color-brand-400)] ${PHASE_CLASS[phase]}`} />
		</div>
	);
}
