import { data, redirect } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { documentPath, documentSlug } from "~/lib/documents";
import { getServerApi } from "~/lib/api.server";
import { renderMarkdown } from "~/lib/markdown";
import type { Route } from "./+types/document";

export function meta({ loaderData }: Route.MetaArgs) {
	const document = loaderData?.document;

	if (!document) return [{ title: "Page not found · Toneflix Photos" }];

	return [{ title: `${document.title} · Toneflix Photos` }, ...(document.summary ? [{ name: "description", content: document.summary }] : [])];
}

/** A published page or policy. Built-in pages open at their short address. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);
	const { data: document } = await api.document(documentSlug(request, params.slug)).catch(() => {
		throw data("Page not found", { status: 404 });
	});

	if (params.slug && documentPath(document) !== `/pages/${params.slug}`) throw redirect(documentPath(document));

	return { document, html: renderMarkdown(document.body) };
}

const updated = (date: string) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function DocumentPage({ loaderData }: Route.ComponentProps) {
	const { document, html } = loaderData;

	return (
		<main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
			<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{document.title}</h1>
			{document.summary && <p className="mt-3 text-lg text-ink-500">{document.summary}</p>}
			<p className="mt-4 text-sm text-ink-500">Updated {updated(document.updatedAt)}</p>
			<article className="markdown mt-10" dangerouslySetInnerHTML={{ __html: html }} />
		</main>
	);
}
