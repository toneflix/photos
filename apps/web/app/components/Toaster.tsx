import { Toaster as Sonner } from "sonner";

/** Short confirmations at the bottom of the screen, in the flat look. */
export function Toaster() {
	return (
		<Sonner
			position="bottom-center"
			offset={24}
			mobileOffset={16}
			toastOptions={{
				unstyled: true,
				classNames: {
					toast: "flex w-full items-center gap-3 rounded-[0.625rem] bg-ink-900 px-4 py-3 text-sm font-medium text-white",
					icon: "text-emerald-300",
					error: "bg-red-700",
				},
			}}
		/>
	);
}
