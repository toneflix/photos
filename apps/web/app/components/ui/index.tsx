import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";

type Variant = "primary" | "brand" | "dark" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
	primary: "border-gold-500 bg-gold-400 text-ink-900 shadow-[0_3px_0_0_var(--color-gold-600)] hover:bg-gold-300",
	brand: "border-brand-700 bg-brand-600 text-white shadow-[0_3px_0_0_var(--color-brand-800)] hover:bg-brand-500",
	dark: "border-ink-900 bg-ink-900 text-white shadow-[0_3px_0_0_rgb(0_0_0/0.35)] hover:bg-ink-700",
	secondary: "border-surface-300 bg-white text-ink-900 shadow-[0_3px_0_0_var(--color-surface-200)] hover:border-ink-500",
	ghost: "border-transparent text-ink-700 hover:bg-surface-100",
	danger: "border-red-300 bg-white text-red-700 shadow-[0_3px_0_0_var(--color-red-100)] hover:bg-red-50",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
	return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.625rem] border-[1.5px] px-4 py-2.5 text-sm font-semibold transition active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${extra}`;
}

export function Button({
	variant = "primary",
	className = "",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
	return <button type="button" {...props} className={buttonClass(variant, className)} />;
}

export function Field({
	label,
	error,
	hint,
	children,
}: {
	label: string;
	error?: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<label className="block">
			<span className="mb-1.5 block text-sm font-semibold text-ink-900">{label}</span>
			{children}
			{error ? (
				<span className="mt-1 block text-sm text-red-700">{error}</span>
			) : hint ? (
				<span className="mt-1 block text-xs text-ink-500">{hint}</span>
			) : null}
		</label>
	);
}

/** A text input. With `addon`, fixed text such as a URL path sits inside the same field. */
export function Input({ addon, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { addon?: ReactNode }) {
	if (!addon) return <input {...props} className={`field px-3.5 py-3 ${className}`} />;

	return (
		<div className={`field ${className}`}>
			<span className="field-addon pl-3.5">{addon}</span>
			<input {...props} className="field-input py-3 pr-3.5 pl-0.5" />
		</div>
	);
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea {...props} className={`field px-3.5 py-3 ${className}`} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
	return <select {...props} className={`field cursor-pointer px-3.5 py-3 ${className}`} />;
}

export function Logo({ to = "/", light = false, compact = false }: { to?: string; light?: boolean; compact?: boolean }) {
	return (
		<Link to={to} aria-label="Toneflix Photos" className={`flex shrink-0 items-center gap-2.5 ${light ? "text-white" : "text-ink-900"}`}>
			<img src="/brand/toneflix-mark.png" alt="" width="18" height="32" className="h-8 w-auto" />
			<span className={`whitespace-nowrap font-display text-lg font-bold tracking-tight sm:text-xl ${compact ? "hidden sm:inline" : ""}`}>Photos</span>
		</Link>
	);
}

export function Alert({ children }: { children: ReactNode }) {
	return (
		<div role="alert" className="rounded-[0.625rem] border-[1.5px] border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
			{children}
		</div>
	);
}

export function Notice({ children }: { children: ReactNode }) {
	return (
		<div role="status" className="rounded-[0.625rem] border-[1.5px] border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
			{children}
		</div>
	);
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
			<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
			<path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
		</svg>
	);
}
export { OtpInput } from "./OtpInput";
