import { useState } from "react";
import { Outlet } from "react-router";
import { optionalUser } from "~/lib/session.server";
import { AppHeader } from "~/components/AppHeader";
import { SiteFooter } from "~/components/SiteFooter";
import { ExplorePhotoDialog } from "~/components/explore/ExplorePhotoDialog";
import { PhotoDialogHost, PhotoTrail } from "~/lib/photo-dialog";
import { revalidateOnSubmit } from "~/lib/revalidate";
import type { Route } from "./+types/layout";

/** Explore is open to everyone; signed-in people keep their usual header. Photos opened from a list show in a dialog over the page. */
export async function loader({ request, context }: Route.LoaderArgs) {
	return { user: await optionalUser(request, context) };
}

export const shouldRevalidate = revalidateOnSubmit;

export default function ExploreLayout({ loaderData }: Route.ComponentProps) {
	const [trail] = useState(() => new PhotoTrail());

	return (
		<div className="flex min-h-dvh flex-col bg-canvas">
			<AppHeader user={loaderData.user} />
			<div className="flex-1">
				<PhotoDialogHost value={trail}>
					<Outlet />
					<ExplorePhotoDialog />
				</PhotoDialogHost>
			</div>
			<SiteFooter />
		</div>
	);
}
