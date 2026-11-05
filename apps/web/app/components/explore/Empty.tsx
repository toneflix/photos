import type { ReactNode } from "react";

/** What an Explore tab shows before anyone has shared anything. */
export function Empty({ children }: { children: ReactNode }) {
	return <p className="rounded-xl bg-surface-100 px-6 py-10 text-center text-ink-500">{children}</p>;
}
