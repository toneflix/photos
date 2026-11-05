import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";

type Variant = "primary" | "brand" | "dark" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
	primary: "bg-gold-400 text-ink-900 hover:bg-gold-300",
	brand: "bg-brand-700 text-white hover:bg-brand-800",
	dark: "bg-ink-900 text-white hover:bg-ink-700",
	secondary: "border border-surface-300 bg-white text-ink-900 hover:border-ink-500",
	ghost: "text-ink-700 hover:bg-surface-100",
	danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
	return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${extra}`;
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

const inputClass =
	"block w-full rounded-lg border border-surface-300 bg-white px-3.5 py-3 text-ink-900 placeholder:text-ink-500 transition hover:border-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Logo({ to = "/", light = false, compact = false }: { to?: string; light?: boolean; compact?: boolean }) {
	return (
		<Link to={to} className={`flex items-center gap-2.5 ${light ? "text-white" : "text-ink-900"}`}>
			<img src="/brand/toneflix-mark.png" alt="" width="18" height="32" className="h-8 w-auto" />
			<span className={`whitespace-nowrap font-display text-lg font-bold tracking-tight sm:text-xl ${compact ? "hidden sm:inline" : ""}`}>Toneflix Photos</span>
		</Link>
	);
}

export function Alert({ children }: { children: ReactNode }) {
	return (
		<div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
			{children}
		</div>
	);
}

export function Notice({ children }: { children: ReactNode }) {
	return (
		<div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
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
