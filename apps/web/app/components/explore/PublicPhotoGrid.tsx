import { Link } from "react-router";
import type { PublicPhoto } from "@photos/types";
import { Owner } from "./Owner";
import { guardImage, licenseFor } from "~/lib/licenses";

/** A masonry wall of public photos. Hovering shows who took each one. */
export function PublicPhotoGrid({ photos }: { photos: PublicPhoto[] }) {
	return (
		<ul className="columns-2 gap-4 sm:columns-3 lg:columns-4">
			{photos.map((photo) => (
				<li key={photo.id} className="mb-4 break-inside-avoid">
					<Link
						to={`/explore/photos/${photo.id}`}
						className="group relative block overflow-hidden rounded-lg bg-surface-200"
						style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3" }}
					>
						<img
							src={photo.url}
							alt={photo.caption ?? ""}
							loading="lazy"
							decoding="async"
							className="fade-in-img h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
							{...guardImage(licenseFor(photo.license))}
						/>
						<span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
						<span className="absolute inset-x-0 bottom-0 p-3 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
							<Owner owner={photo.owner} light />
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}
