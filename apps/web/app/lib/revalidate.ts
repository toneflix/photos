import type { ShouldRevalidateFunctionArgs } from "react-router";

/**
 * For layouts whose data (the signed-in user, a space) only changes when a
 * form is sent: plain link clicks keep what was already loaded.
 */
export function revalidateOnSubmit({ formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
	return formMethod !== undefined && formMethod !== "GET" && defaultShouldRevalidate;
}
