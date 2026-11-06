import { useEffect } from "react";
import { toast } from "sonner";

export { toast };

/** Shows an action's success message as a toast each time the action answers. */
export function useToastMessage(result: { message?: string | null } | null | undefined) {
	useEffect(() => {
		if (result?.message) toast.success(result.message, { id: result.message });
	}, [result]);
}

/** Copies text and says with a toast whether it worked. */
export async function copyText(text: string, confirmation = "Copied.") {
	try {
		await navigator.clipboard.writeText(text);

		toast.success(confirmation, { id: confirmation });
	} catch {
		toast.error("Couldn't copy. Select the text and copy it yourself.");
	}
}
