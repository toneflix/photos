import { createContext } from "react-router";

/**
 * Cloudflare bindings for the current request. Read it in loaders, actions
 * and middleware with `context.get(cloudflareContext)`.
 */
export const cloudflareContext = createContext<{
	env: Env;
	ctx: ExecutionContext;
}>();
