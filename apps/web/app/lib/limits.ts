import { useRouteLoaderData } from "react-router";
import { DEFAULT_LIMITS, type AppLimits } from "@photos/types";

/** Upload sizes and other limits admins set, loaded once per page load by the root route. */
export function useLimits(): AppLimits {
	return (useRouteLoaderData("root") as { limits?: AppLimits } | undefined)?.limits ?? DEFAULT_LIMITS;
}
