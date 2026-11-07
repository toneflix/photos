import type { SettingField } from "@photos/types";

type Value = number | boolean | string | null;

/** How a value reads to people, with its unit. */
export function describeValue(field: SettingField, value: Value) {
	if (field.type === "boolean") return value ? "on" : "off";
	if (field.type === "select") return field.options?.find((option) => option.value === value)?.label ?? String(value);
	if (field.type === "text") return `“${value}”`;

	return field.unit ? `${value} ${field.unit}` : String(value);
}

/**
 * One setting on the configuration form. Number, text and choice fields are boxes with the
 * label inside; on/off fields are cards with a switch. Below each is its help and
 * the .env default it falls back to.
 */
export function SettingControl({
	field,
	value,
	error,
	onChange,
}: {
	field: SettingField;
	value: Value;
	error?: string;
	onChange: (value: Value) => void;
}) {
	const id = `setting-${field.name}`;
	const isDefault = value === field.default || value === null || value === "";
	const fallback = (
		<>
			Default {describeValue(field, field.default)}
			{field.env && (
				<>
					{" "}
					from <code className="rounded bg-surface-100 px-1 py-0.5 text-[0.7rem] text-ink-700">{field.env}</code>
				</>
			)}
			{!isDefault && (
				<>
					{" · "}
					<button type="button" onClick={() => onChange(field.default)} className="font-semibold text-brand-700 hover:underline">
						Use default
					</button>
				</>
			)}
		</>
	);

	if (field.type === "boolean") {
		const on = Boolean(value);

		return (
			<div className="sm:col-span-2">
				<div className="panel flex items-start gap-4 p-4 sm:p-5">
					<button
						type="button"
						role="switch"
						id={id}
						aria-checked={on}
						aria-labelledby={`${id}-label`}
						onClick={() => onChange(!on)}
						className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brand-600" : "bg-surface-300"}`}
					>
						<span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} />
					</button>
					<div>
						<p id={`${id}-label`} className="font-semibold text-ink-900">
							{field.label}
						</p>
						{field.help && <p className="text-sm text-ink-500">{field.help}</p>}
						<p className="mt-1 text-xs text-ink-500">{fallback}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={field.type === "text" ? "sm:col-span-2" : undefined}>
			<label htmlFor={id} className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5" aria-invalid={error ? true : undefined}>
				<span className="text-xs font-medium text-ink-500">{field.label}</span>
				{field.type === "select" ? (
					<select
						id={id}
						value={String(value ?? field.default)}
						onChange={(event) => onChange(event.target.value)}
						className="field-input -ml-1 cursor-pointer text-base text-ink-900"
					>
						{field.options?.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				) : field.type === "text" ? (
					<input
						id={id}
						type="text"
						maxLength={field.max ?? undefined}
						value={value === null ? "" : String(value)}
						placeholder={String(field.default)}
						onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
						className="field-input text-base text-ink-900"
					/>
				) : (
					<span className="flex items-baseline gap-2">
						<input
							id={id}
							type="number"
							inputMode="numeric"
							min={field.min ?? undefined}
							max={field.max ?? undefined}
							value={value === null ? "" : String(value)}
							placeholder={String(field.default)}
							onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
							className="field-input text-base text-ink-900"
						/>
						{field.unit && <span className="text-sm text-ink-500">{field.unit}</span>}
					</span>
				)}
			</label>
			{error ? (
				<p className="mt-1.5 px-1 text-xs text-red-700">{error}</p>
			) : (
				<p className="mt-1.5 px-1 text-xs text-ink-500">
					{field.help && <span className="block">{field.help}</span>}
					{fallback}
				</p>
			)}
		</div>
	);
}
