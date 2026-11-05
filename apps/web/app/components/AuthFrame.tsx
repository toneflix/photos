import type { ReactNode } from "react";
import { Logo } from "~/components/ui";
import { Mosaic } from "~/components/Mosaic";

/** Layout for the sign-in, sign-up and account recovery pages: the form beside a wall of photos. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
	return (
		<div className="flex min-h-dvh bg-white">
			<aside className="bg-gold-glow relative isolate hidden w-[44%] overflow-hidden lg:block">
				<Mosaic columns={4} className="absolute -inset-x-6 -top-6 -z-10 opacity-60 mix-blend-soft-light" />
				<div className="flex h-full flex-col justify-between p-10">
					<Logo />
					<p className="max-w-sm font-display text-3xl leading-tight font-bold text-ink-900">Every photo you keep here is kept for all time.</p>
				</div>
			</aside>
			<main className="flex flex-1 flex-col px-4 py-5 sm:px-10">
				<div className="lg:hidden">
					<Logo />
				</div>
				<div className="flex flex-1 items-start justify-center pt-10 sm:items-center sm:pt-0">
					<div className="w-full max-w-sm">
						<h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
						<p className="mt-2 text-sm text-ink-500">{subtitle}</p>
						<div className="mt-8">{children}</div>
					</div>
				</div>
			</main>
		</div>
	);
}
