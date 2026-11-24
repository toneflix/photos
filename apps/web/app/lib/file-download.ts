import { useCallback, useRef, useState } from "react";
import { toast } from "~/lib/toast";

/** The file name a response's Content-Disposition gives, else `fallback`. */
function filename(response: Response, fallback: string) {
	const header = response.headers.get("content-disposition") ?? "";
	const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
	const plain = /filename="?([^";]+)"?/i.exec(header)?.[1];

	return encoded ? decodeURIComponent(encoded) : (plain ?? fallback);
}

/** How long a print page may take to load its photos before we give up. The page is drawn once it has loaded. */
const PRINT_TIMEOUT = 120_000;

/**
 * Downloads files that take a while to prepare, and prints pages from a hidden frame. While one is on its
 * way `pending` holds its address, and further starts do nothing until it arrives or fails.
 */
export function useFileDownload() {
	const [pending, setPending] = useState<string | null>(null);
	const busy = useRef(false);

	const start = useCallback(async (href: string, fallbackName = "download") => {
		if (busy.current) return;

		busy.current = true;
		setPending(href);

		try {
			const response = await fetch(href);

			if (!response.ok) {
				toast.error((await response.text()) || "We couldn't prepare your download. Please try again in a minute.");

				return;
			}

			const url = URL.createObjectURL(await response.blob());
			const link = document.createElement("a");

			link.href = url;
			link.download = filename(response, fallbackName);
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch {
			toast.error("We couldn't prepare your download. Check your connection and try again.");
		} finally {
			busy.current = false;
			setPending(null);
		}
	}, []);

	const print = useCallback(async (href: string) => {
		if (busy.current) return;

		busy.current = true;
		setPending(href);
		document.querySelectorAll("iframe[data-print-frame]").forEach((frame) => frame.remove());

		const frame = document.createElement("iframe");

		frame.dataset.printFrame = "";
		frame.title = "Print";
		frame.setAttribute("aria-hidden", "true");
		frame.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;";

		try {
			await new Promise<void>((resolve, reject) => {
				const timer = window.setTimeout(() => reject(new Error("Your book took too long to get ready. Please try again.")), PRINT_TIMEOUT);

				frame.addEventListener("load", () => {
					const page = frame.contentDocument;

					window.clearTimeout(timer);
					if (page?.getElementById("book")) resolve();
					else reject(new Error(page?.body?.innerText.trim() || "We couldn't get your book ready to print."));
				});
				frame.src = href;
				document.body.append(frame);
			});

			await frame.contentDocument?.fonts?.ready;

			frame.contentWindow?.focus();
			frame.contentWindow?.print();
		} catch (error) {
			frame.remove();
			toast.error(error instanceof Error ? error.message : "We couldn't get your book ready to print.");
		} finally {
			busy.current = false;
			setPending(null);
		}
	}, []);

	return { pending, start, print };
}
