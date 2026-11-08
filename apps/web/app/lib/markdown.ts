import { Marked } from "marked";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Markdown for pages and policies. Raw HTML shows as text, so a page can only hold what Markdown allows. */
const markdown = new Marked({
	gfm: true,
	renderer: {
		html: ({ text }) => escape(text),
	},
});

/** A page's Markdown body as HTML. */
export function renderMarkdown(body: string): string {
	return markdown.parse(body, { async: false });
}
