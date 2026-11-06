import { useRouteLoaderData } from "react-router";
import type { AppLimits } from "@photos/types";

/** Used when the API can't be reached; the API still enforces its own limits. */
export const DEFAULT_LIMITS: AppLimits = { maxPhotoMb: 25, maxAvatarMb: 10, maxBookPages: 500, registrationOpen: true };

/** Upload sizes and other limits admins set, loaded once per page load by the root route. */
export function useLimits(): AppLimits {
	return (useRouteLoaderData("root") as { limits?: AppLimits } | undefined)?.limits ?? DEFAULT_LIMITS;
}
