import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
	primary: "bg-ink-900 text-paper-50 hover:bg-ink-700",
	secondary: "border border-paper-300 bg-white text-ink-900 hover:bg-paper-100",
	ghost: "text-ink-700 hover:bg-paper-200/70",
	danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
	return `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${extra}`;
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
			<span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
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
	"block w-full rounded-xl border border-paper-300 bg-white px-3.5 py-2.5 text-ink-900 placeholder:text-ink-500/60 focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Logo({ to = "/", light = false, compact = false }: { to?: string; light?: boolean; compact?: boolean }) {
	return (
		<Link to={to} className={`flex items-center gap-2 ${light ? "text-paper-50" : "text-ink-900"}`}>
			<svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
				<rect x="3" y="5" width="12" height="22" rx="1.5" fill="currentColor" opacity="0.85" />
				<rect x="17" y="5" width="12" height="22" rx="1.5" fill="currentColor" opacity="0.55" />
				<rect x="15" y="4" width="2" height="24" fill="#b4532a" />
			</svg>
			<span className={`font-serif text-xl tracking-tight ${compact ? "hidden sm:inline" : ""}`}>Toneflix Photos</span>
		</Link>
	);
}

export function Alert({ children }: { children: ReactNode }) {
	return (
		<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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
