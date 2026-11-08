import { useState, type InputHTMLAttributes } from "react";
import { Link, data, redirect, useFetcher } from "react-router";
import type { DocumentInput, DocumentType, SiteDocument } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Icon } from "~/components/admin/Icon";
import { MarkdownEditor } from "~/components/admin/MarkdownEditor";
import { Alert, Button, buttonClass } from "~/components/ui";
import { documentPath } from "~/lib/documents";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/pages";

export const meta = () => [{ title: "Pages · Admin · Toneflix Photos" }];

type PageForm = { intent: "save" | "delete" } & DocumentInput;

const TYPES: { value: DocumentType; label: string }[] = [
	{ value: "page", label: "Page" },
	{ value: "policy", label: "Policy" },
];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "pages.manage");
	const { data: documents } = await api.admin.documents({ per_page: 100 });
	const creating = params.document === "new";
	const id = creating ? null : (params.document ?? documents[0]?.id);
	const current = id
		? await api.admin
				.document(id)
				.then((result) => result.data)
				.catch(() => null)
		: null;

	if (params.document && !creating && !current) throw new Response("Not found", { status: 404 });

	return { documents, current, creating, chosen: Boolean(params.document) };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "pages.manage");
	const { intent, ...input } = (await request.json()) as PageForm;

	try {
		if (intent === "delete") {
			await api.admin.removeDocument(String(params.document));

			return redirect("/admin/pages");
		}

		if (params.document === "new") {
			const { data: document } = await api.admin.createDocument({ ...input, title: input.title ?? "", body: input.body ?? "" });

			return redirect(`/admin/pages/${document.id}`);
		}

		await api.admin.updateDocument(String(params.document), input);

		return { message: "Saved.", error: null, fieldErrors: {} as Record<string, string> };
	} catch (error) {
		const result = formError(error);

		return data({ message: null, ...result }, { status: 422 });
	}
}

/** The privacy policy, terms, about page and any others admins write. Pages are on the left, the chosen one's editor on the right. */
export default function AdminPages({ loaderData }: Route.ComponentProps) {
	const { documents, current, creating, chosen } = loaderData;

	return (
		<>
			<AdminHeader title="Pages" description="The about page, policies and any other pages people can read. Written in Markdown." />
			<div className="lg:grid lg:grid-cols-[22rem_1fr]">
				<nav aria-label="Pages" className={`border-surface-200 p-3 lg:block lg:border-r-[1.5px] ${chosen ? "hidden" : ""}`}>
					<Link prefetch="intent" to="/admin/pages/new" className={buttonClass("brand", "mb-3 w-full")}>
						<Icon name="plus" className="h-4 w-4" />
						New page
					</Link>
					<ul className="space-y-1">
						{documents.map((document) => {
							const active = !creating && document.id === current?.id;

							return (
								<li key={document.id}>
									<Link
										prefetch="intent"
										to={`/admin/pages/${document.id}`}
										className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition ${active ? "bg-white ring-[1.5px] ring-surface-200 lg:bg-surface-100 lg:ring-0" : "hover:bg-surface-100"}`}
									>
										<Icon name={document.type === "policy" ? "shield" : "file"} className="h-5 w-5 text-ink-500" />
										<span className="min-w-0 flex-1">
											<span className={`flex items-center gap-2 font-semibold ${active ? "text-brand-700" : "text-ink-900"}`}>
												<span className="truncate">{document.title}</span>
												{!document.published && <span className="rounded-md bg-surface-200 px-1.5 py-0.5 text-xs font-semibold text-ink-700">Draft</span>}
											</span>
											<span className="block truncate text-sm text-ink-500">
												{document.type === "policy" ? "Policy" : "Page"} · {documentPath(document)}
											</span>
										</span>
										<Icon name="chevron" className="h-4 w-4 text-ink-500" />
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
				<div className={chosen ? "" : "hidden lg:block"}>
					<PageEditor key={creating ? "new" : (current?.id ?? "new")} document={creating ? null : current} />
				</div>
			</div>
		</>
	);
}

function PageEditor({ document }: { document: SiteDocument | null }) {
	const fetcher = useFetcher<typeof action>();
	const [form, setForm] = useState({
		title: document?.title ?? "",
		slug: document?.slug ?? "",
		type: document?.type ?? ("page" as DocumentType),
		summary: document?.summary ?? "",
		sort: document?.sort ?? 0,
		published: document?.published ?? false,
		body: document?.body ?? "",
	});
	const [changed, setChanged] = useState(false);
	const builtIn = !!document?.builtIn;
	const busy = fetcher.state !== "idle";
	const result = fetcher.state === "idle" && !changed ? fetcher.data : undefined;
	const errors = (result?.fieldErrors ?? {}) as Record<string, string | undefined>;

	useToastMessage(fetcher.data);

	const change = (next: Partial<typeof form>) => {
		setChanged(true);
		setForm((now) => ({ ...now, ...next }));
	};
	const send = (intent: PageForm["intent"]) => {
		setChanged(false);
		fetcher.submit(
			{ intent, ...form, slug: form.slug || null, summary: form.summary || null },
			{ method: "post", encType: "application/json", action: `/admin/pages/${document?.id ?? "new"}` },
		);
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				send("save");
			}}
			className="flex min-h-full flex-col"
		>
			<div className="flex-1 space-y-6 px-4 py-6 sm:px-8">
				<Link prefetch="intent" to="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 lg:hidden">
					<Icon name="back" className="h-4 w-4" />
					All pages
				</Link>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{document ? document.title : "New page"}</h2>
						<p className="mt-1 text-ink-500">
							{builtIn ? "Built in. The apps link to this page, so it stays published at the same address." : "Drafts only show here until you publish them."}
						</p>
					</div>
					{document?.published && (
						<Link to={documentPath(document)} target="_blank" className={buttonClass("secondary")}>
							<Icon name="eye" className="h-4 w-4" />
							View page
						</Link>
					)}
				</div>
				{result?.error && <Alert>{result.error}</Alert>}
				<div className="grid gap-5 sm:grid-cols-2">
					<TextField
						label="Title"
						error={errors.title}
						required
						maxLength={120}
						value={form.title}
						onChange={(title) => change({ title })}
						placeholder="Community guidelines"
					/>
					<TextField
						label="Address"
						error={errors.slug}
						maxLength={60}
						value={form.slug}
						disabled={builtIn}
						onChange={(slug) => change({ slug: slug.toLowerCase() })}
						placeholder="Made from the title"
					/>
					<div className="sm:col-span-2">
						<TextField
							label="Summary"
							error={errors.summary}
							maxLength={300}
							value={form.summary}
							onChange={(summary) => change({ summary })}
							placeholder="One line under the title, also used by search engines"
						/>
					</div>
					<label className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5">
						<span className="text-xs font-medium text-ink-500">Kind</span>
						<select
							value={form.type}
							onChange={(event) => change({ type: event.target.value as DocumentType })}
							className="field-input -ml-1 cursor-pointer text-base text-ink-900"
						>
							{TYPES.map((type) => (
								<option key={type.value} value={type.value}>
									{type.label}
								</option>
							))}
						</select>
					</label>
					<TextField
						label="Order"
						error={errors.sort}
						type="number"
						min={0}
						max={1000}
						value={String(form.sort)}
						onChange={(sort) => change({ sort: Number(sort) || 0 })}
					/>
				</div>
				<div className="panel flex items-start gap-4 p-4 sm:p-5">
					<button
						type="button"
						role="switch"
						aria-checked={form.published}
						aria-labelledby="page-published"
						disabled={builtIn}
						onClick={() => change({ published: !form.published })}
						className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${form.published ? "bg-brand-600" : "bg-surface-300"}`}
					>
						<span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${form.published ? "translate-x-5" : ""}`} />
					</button>
					<div>
						<p id="page-published" className="font-semibold text-ink-900">
							Published
						</p>
						<p className="text-sm text-ink-500">Published pages show in the footer on the web and under Account in the app.</p>
						{errors.published && <p className="mt-1 text-xs text-red-700">{errors.published}</p>}
					</div>
				</div>
				<div>
					<MarkdownEditor value={form.body} onChange={(body) => change({ body })} invalid={!!errors.body} />
					{errors.body && <p className="mt-1.5 px-1 text-xs text-red-700">{errors.body}</p>}
				</div>
			</div>
			<div className="sticky bottom-0 flex items-center justify-end gap-3 border-t-[1.5px] border-surface-200 bg-canvas/95 px-4 py-4 backdrop-blur sm:px-8">
				{document && !builtIn && (
					<Button
						variant="danger"
						disabled={busy}
						onClick={() => {
							if (confirm(`Delete ${document.title}?`)) send("delete");
						}}
					>
						Delete
					</Button>
				)}
				<Button type="submit" variant="brand" disabled={busy} className="min-w-24">
					{busy ? "Saving…" : document ? "Save" : "Create page"}
				</Button>
			</div>
		</form>
	);
}

function TextField({
	label,
	error,
	onChange,
	...props
}: { label: string; error?: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange">) {
	return (
		<div>
			<label className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5" aria-invalid={error ? true : undefined}>
				<span className="text-xs font-medium text-ink-500">{label}</span>
				<input {...props} onChange={(event) => onChange(event.target.value)} className="field-input text-base text-ink-900 disabled:text-ink-500" />
			</label>
			{error && <p className="mt-1.5 px-1 text-xs text-red-700">{error}</p>}
		</div>
	);
}
