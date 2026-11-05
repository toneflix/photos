import type { ReactNode } from "react";
import { Logo } from "~/components/ui";

/** Layout for the sign-in and sign-up pages. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col bg-paper-100">
			<header className="px-6 py-5">
				<Logo />
			</header>
			<main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
				<div className="w-full max-w-md rounded-3xl border border-paper-200 bg-white p-8 shadow-sm">
					<h1 className="font-serif text-3xl text-ink-900">{title}</h1>
					<p className="mt-2 text-sm text-ink-500">{subtitle}</p>
					<div className="mt-8">{children}</div>
				</div>
			</main>
		</div>
	);
}
