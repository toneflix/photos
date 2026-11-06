import { useEffect, useRef, useState } from "react";

/**
 * A one-time code as a row of digit boxes. One real input sits over the boxes and takes the
 * typing, so paste and browser code autofill fill every box. Submits its form once the code is complete, and clears a rejected code.
 */
export function OtpInput({
	name,
	length = 6,
	invalid = false,
	autoFocus = false,
	disabled = false,
}: {
	name: string;
	length?: number;
	invalid?: boolean;
	autoFocus?: boolean;
	disabled?: boolean;
}) {
	const input = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState("");
	const [focused, setFocused] = useState(false);
	const active = Math.min(value.length, length - 1);

	// A rejected code is cleared once the check finishes, ready for the next try.
	useEffect(() => {
		if (disabled || !invalid) return;

		setValue("");
		input.current?.focus();
	}, [disabled, invalid]);

	return (
		<div className="relative flex justify-center gap-2" onClick={() => input.current?.focus()}>
			{Array.from({ length }, (_, i) => (
				<span
					key={i}
					aria-hidden
					className={`flex aspect-[5/6] w-full max-w-13 items-center justify-center rounded-[0.625rem] border-[1.5px] font-mono text-2xl font-semibold text-ink-900 tabular-nums transition ${
						i === length / 2 ? "ml-2" : ""
					} ${invalid ? "border-red-600" : focused && i === active ? "border-brand-600 bg-white shadow-[inset_0_0_0_1px_var(--color-brand-600)]" : "border-surface-300 bg-white"}`}
				>
					{value[i] ?? ""}
				</span>
			))}
			<input
				ref={input}
				name={name}
				value={value}
				onChange={(event) => {
					const digits = event.target.value.replace(/\D/g, "").slice(0, length);

					setValue(digits);
					if (digits.length === length && digits !== value) event.target.form?.requestSubmit();
				}}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				inputMode="numeric"
				autoComplete="one-time-code"
				pattern={`[0-9]{${length}}`}
				maxLength={length}
				aria-label={`${length}-digit code`}
				required
				autoFocus={autoFocus}
				readOnly={disabled}
				className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
			/>
		</div>
	);
}
