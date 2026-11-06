import { Link } from "react-router";
import { LICENSES } from "~/lib/licenses";

export const meta = () => [
	{ title: "Photo licences · Toneflix Photos" },
	{ name: "description", content: "What you can do with photos on Toneflix Photos, and how photographers choose who may reuse their work." },
];

export default function Licenses() {
	return (
		<main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
			<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">Photo licences</h1>
			<p className="mt-3 max-w-2xl text-lg text-ink-500">
				Every photo on Explore belongs to the person who shared it. They choose a licence, and the licence says what everyone else may do with it.
			</p>

			<ul className="mt-10 grid gap-4 sm:grid-cols-2">
				{LICENSES.map((license) => (
					<li key={license.value} className="rounded-xl border border-surface-200 bg-white p-5">
						<p className="font-display text-lg font-bold text-ink-900">{license.label}</p>
						<p className="text-sm font-medium text-ink-500">
							{license.url ? (
								<a href={license.url} target="_blank" rel="noreferrer license" className="text-brand-700 hover:underline">
									{license.name}
								</a>
							) : (
								license.name
							)}
							{" · "}
							{license.downloadable ? "Can be downloaded" : "No downloads"}
						</p>
						<p className="mt-3 text-ink-700">{license.summary}</p>
					</li>
				))}
			</ul>

			<section className="mt-14 grid gap-10 md:grid-cols-2">
				<div>
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">If you're using a photo</h2>
					<ul className="mt-4 list-disc space-y-2 pl-5 text-ink-700">
						<li>Check the licence on the photo's page before you use it anywhere.</li>
						<li>If it asks for credit, copy the credit line from the photo's page and put it near the photo or in your credits.</li>
						<li>
							"All rights reserved" means look, don't take. To use one of these photos, ask the photographer first. Saving or screenshotting it doesn't give you
							permission.
						</li>
						<li>A licence covers the photo, not the people or brands in it. If you're using it in an advert, you may need their permission too.</li>
					</ul>
				</div>
				<div>
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">If you're sharing your photos</h2>
					<ul className="mt-4 list-disc space-y-2 pl-5 text-ink-700">
						<li>Your photos are private until you turn on Show on Explore. You keep all rights unless you pick another licence.</li>
						<li>
							Set the licence for new uploads in{" "}
							<Link prefetch="intent" to="/settings/sharing" className="font-medium text-brand-700 hover:underline">
								Sharing settings
							</Link>
							, and change it for any photo from your library.
						</li>
						<li>Only photos with an open licence get a download button. Photos you keep all rights to can't be right-clicked or dragged off the page.</li>
						<li>
							Creative Commons licences can't be taken back from someone who already downloaded the photo. Switching back to "All rights reserved" stops new
							downloads.
						</li>
						<li>Only share photos you took or have the right to share.</li>
					</ul>
				</div>
			</section>
		</main>
	);
}
