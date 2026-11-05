import { data } from "react-router";
import { formError } from "./api.server";

/**
 * Run one settings change and report back to the form that sent it. Each form
 * on a settings page posts an `intent`, and its result carries the same one.
 * `keepOnError` is returned with a failure so the form can show its state again.
 */
export async function settingsAction<T extends object = object>(
	intent: string,
	run: () => Promise<{ message: string } & T>,
	keepOnError: object = {},
) {
	try {
		return { intent, error: null, fieldErrors: {} as Record<string, string>, ...(await run()) };
	} catch (error) {
		const result = formError(error);

		return data({ intent, message: null, ...keepOnError, ...result }, { status: result.status === 503 ? 503 : 422 });
	}
}
