import { useCallback, useRef, useState } from "react";
import { toast } from "~/lib/toast";

/** The file name a response's Content-Disposition gives, else `fallback`. */
function filename(response: Response, fallback: string) {
	const header = response.headers.get("content-disposition") ?? "";
	const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
	const plain = /filename="?([^";]+)"?/i.exec(header)?.[1];

	return encoded ? decodeURIComponent(encoded) : (plain ?? fallback);
}

/**
 * Downloads files that take a while to prepare. While one is on its way `pending` holds its address,
 * and further starts do nothing until it arrives or fails.
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

	return { pending, start };
}
