import { useEffect, useRef, useState } from "react";
import { data, Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import { BOOK_PERMISSIONS, type BookAccessCode, type BookPermission } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireSignIn } from "~/lib/session.server";
import { Alert, Button, Field, Input, Select } from "~/components/ui";
import type { Route } from "./+types/book-access";

export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: `Access codes for ${loaderData?.book.title ?? "book"} · Toneflix Photos` }];
}

/** How long a new code works for, in days. */
const EXPIRY: [string, number | null][] = [
	["Never expires", null],
	["1 day", 1],
	["1 week", 7],
	["30 days", 30],
];

const EXTRA_PERMISSIONS: BookPermission[] = ["add", "edit", "transfer"];

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const book = await api.books.get(params.id).then(
		(response) => response.data,
		() => {
			throw data("Book not found", { status: 404 });
		},
	);

	if (!book.isOwner) throw redirect(`/books/${book.id}`);

	const { data: codes } = await api.books.accessCodes(book.id);

	return { book, codes };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();
	const intent = form.get("intent");
	const permissions = form.getAll("permissions").map(String) as BookPermission[];
	const label = String(form.get("label") ?? "").trim() || null;

	try {
		if (intent === "create") {
			const days = Number(form.get("expiresIn")) || null;
			const expiresAt = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
			const { data: code } = await api.books.createAccessCode(params.id, { label, permissions, expiresAt });

			return { ok: true as const, created: code.id, error: null };
		}

		if (intent === "update") {
			await api.books.updateAccessCode(params.id, String(form.get("codeId")), { label, permissions });
			return { ok: true as const, created: null, error: null };
		}

		if (intent === "revoke") {
			await api.books.revokeAccessCode(params.id, String(form.get("codeId")));
			return { ok: true as const, created: null, error: null };
		}
	} catch (error) {
		const result = formError(error);
		return data({ ok: false as const, created: null, error: result.error }, { status: result.status });
	}

	return null;
}

export default function BookAccess({ loaderData, actionData }: Route.ComponentProps) {
	const { book, codes } = loaderData;
	const busy = useNavigation().state !== "idle";
	const form = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (actionData?.created) form.current?.reset();
	}, [actionData]);

	return (
		<main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
			<Link prefetch="intent" to={`/books/${book.id}/edit`} className="text-sm font-medium text-brand-700 hover:underline">
				← Back to “{book.title}”
			</Link>
			<h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-900">Access codes</h1>
			<p className="mt-2 text-ink-500">
				Anyone you give a code to can open “{book.title}”, even while it's private. Choose what else each code lets them do. Revoke a code to lock them out
				again.
			</p>

			<section className="mt-8 panel p-5 sm:p-6">
				<h2 className="font-display text-xl font-bold text-ink-900">New code</h2>
				<Form method="post" ref={form} className="mt-4 space-y-5">
					<input type="hidden" name="intent" value="create" />
					{actionData && !actionData.ok && <Alert>{actionData.error}</Alert>}
					<div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
						<Field label="Who it's for" hint="Only you see this.">
							<Input name="label" maxLength={80} placeholder="e.g. Ada and Tunde" />
						</Field>
						<Field label="Works for">
							<Select name="expiresIn">
								{EXPIRY.map(([label, days]) => (
									<option key={label} value={days ?? ""}>
										{label}
									</option>
								))}
							</Select>
						</Field>
					</div>
					<PermissionPicker />
					<Button type="submit" disabled={busy}>
						{busy ? "Creating…" : "Create code"}
					</Button>
				</Form>
			</section>

			<section className="mt-10">
				<h2 className="font-display text-xl font-bold text-ink-900">
					{codes.length ? `${codes.length} ${codes.length === 1 ? "code" : "codes"}` : "No codes yet"}
				</h2>
				{!codes.length && <p className="mt-1 text-sm text-ink-500">Codes you create show here with how often they've been used.</p>}
				<ul className="mt-4 space-y-3">
					{codes.map((code) => (
						<CodeCard key={code.id} code={code} highlight={code.id === actionData?.created} />
					))}
				</ul>
			</section>
		</main>
	);
}

function PermissionPicker({ selected = ["view"] }: { selected?: BookPermission[] }) {
	const [transfer, setTransfer] = useState(selected.includes("transfer"));

	return (
		<fieldset>
			<legend className="mb-2 text-sm font-semibold text-ink-900">What it lets them do</legend>
			<div className="grid gap-2 sm:grid-cols-2">
				<label className="flex items-start gap-3 rounded-xl border-[1.5px] border-surface-300 bg-surface-100 px-4 py-3 text-sm">
					<input type="checkbox" checked disabled className="mt-0.5 accent-brand-600" />
					<span>
						<span className="font-semibold text-ink-900">{BOOK_PERMISSIONS.view.label}</span>
						<span className="block text-ink-500">{BOOK_PERMISSIONS.view.description}. Every code can.</span>
					</span>
				</label>
				{EXTRA_PERMISSIONS.map((permission) => (
					<label
						key={permission}
						className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-surface-300 px-4 py-3 text-sm transition hover:border-ink-500 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
					>
						<input
							type="checkbox"
							name="permissions"
							value={permission}
							defaultChecked={selected.includes(permission)}
							onChange={permission === "transfer" ? (e) => setTransfer(e.target.checked) : undefined}
							className="mt-0.5 accent-brand-600"
						/>
						<span>
							<span className="font-semibold text-ink-900">{BOOK_PERMISSIONS[permission].label}</span>
							<span className="block text-ink-500">{BOOK_PERMISSIONS[permission].description}</span>
						</span>
					</label>
				))}
			</div>
			{transfer && (
				<p className="mt-3 rounded-lg border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-ink-900">
					Whoever claims the book with this code becomes its owner and you lose access to it. They get their own copies of the photos; yours stay in your
					library.
				</p>
			)}
		</fieldset>
	);
}

function CodeCard({ code, highlight }: { code: BookAccessCode; highlight: boolean }) {
	const fetcher = useFetcher<typeof action>();
	const [editing, setEditing] = useState(false);
	const [copied, setCopied] = useState<"code" | "link" | null>(null);
	const revoking = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "revoke";

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.ok) setEditing(false);
	}, [fetcher.state, fetcher.data]);

	const copy = async (what: "code" | "link") => {
		await navigator.clipboard?.writeText(what === "code" ? code.code : code.shareUrl).catch(() => {});
		setCopied(what);
		setTimeout(() => setCopied(null), 1500);
	};

	return (
		<li className={`panel p-5 transition ${highlight ? "!border-brand-600" : ""} ${revoking ? "opacity-50" : ""}`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<p className={`font-mono text-2xl font-bold tracking-[0.2em] ${code.expired ? "text-ink-500 line-through" : "text-ink-900"}`}>{code.code}</p>
					<p className="mt-0.5 truncate text-sm text-ink-700">{code.label ?? "No label"}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="secondary" onClick={() => copy("code")}>
						{copied === "code" ? "Copied" : "Copy code"}
					</Button>
					<Button variant="secondary" onClick={() => copy("link")}>
						{copied === "link" ? "Copied" : "Copy link"}
					</Button>
				</div>
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-1.5">
				{code.permissions.map((permission) => (
					<span
						key={permission}
						className={`rounded-full px-2.5 py-1 text-xs font-semibold ${permission === "transfer" ? "bg-gold-100 text-ink-900" : "bg-surface-100 text-ink-700"}`}
					>
						{BOOK_PERMISSIONS[permission].label}
					</span>
				))}
			</div>

			<p className="mt-3 text-sm text-ink-500">
				{usage(code)} · {expiry(code)}
			</p>

			{editing ? (
				<fetcher.Form method="post" className="mt-4 space-y-4 border-t border-surface-200 pt-4">
					<input type="hidden" name="intent" value="update" />
					<input type="hidden" name="codeId" value={code.id} />
					<Field label="Who it's for">
						<Input name="label" maxLength={80} defaultValue={code.label ?? ""} />
					</Field>
					<PermissionPicker selected={code.permissions} />
					{fetcher.data && !fetcher.data.ok && <Alert>{fetcher.data.error}</Alert>}
					<div className="flex gap-2">
						<Button type="submit" disabled={fetcher.state !== "idle"}>
							Save
						</Button>
						<Button variant="ghost" onClick={() => setEditing(false)}>
							Cancel
						</Button>
					</div>
				</fetcher.Form>
			) : (
				<div className="mt-4 flex gap-4 border-t border-surface-200 pt-4 text-sm">
					<button type="button" onClick={() => setEditing(true)} className="font-medium text-brand-700 hover:underline">
						Change
					</button>
					<fetcher.Form
						method="post"
						onSubmit={(e) => {
							if (!confirm(`Revoke ${code.code}? Anyone using it loses access straight away.`)) e.preventDefault();
						}}
					>
						<input type="hidden" name="intent" value="revoke" />
						<input type="hidden" name="codeId" value={code.id} />
						<button type="submit" className="font-medium text-red-700 hover:underline">
							Revoke
						</button>
					</fetcher.Form>
				</div>
			)}
		</li>
	);
}

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

function usage(code: BookAccessCode) {
	if (!code.uses) return "Not used yet";

	const times = code.uses === 1 ? "once" : `${code.uses} times`;
	return code.lastUsedAt ? `Used ${times}, last on ${dateFormat.format(new Date(code.lastUsedAt))}` : `Used ${times}`;
}

function expiry(code: BookAccessCode) {
	if (!code.expiresAt) return "Never expires";

	return `${code.expired ? "Expired" : "Expires"} ${dateFormat.format(new Date(code.expiresAt))}`;
}
