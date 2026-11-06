import { Outlet } from "react-router";
import { optionalUser } from "~/lib/session.server";
import { AppHeader } from "~/components/AppHeader";
import type { Route } from "./+types/layout";

/** Explore is open to everyone; signed-in people keep their usual header. */
export async function loader({ request, context }: Route.LoaderArgs) {
	return { user: await optionalUser(request, context) };
}

export default function ExploreLayout({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-dvh bg-canvas">
			<AppHeader user={loaderData.user} />
			<Outlet />
		</div>
	);
}
