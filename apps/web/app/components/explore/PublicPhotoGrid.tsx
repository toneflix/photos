import { Link } from "react-router";
import type { PublicPhoto } from "@photos/types";
import { Owner } from "./Owner";
import { guardImage, licenseFor } from "~/lib/licenses";
import { usePhotoLink } from "~/lib/photo-dialog";

/** A masonry wall of public photos. Hovering shows who took each one. Inside Explore a photo opens in the photo dialog. */
export function PublicPhotoGrid({ photos, className = "columns-2 sm:columns-3 lg:columns-4" }: { photos: PublicPhoto[]; className?: string }) {
	const linkTo = usePhotoLink();

	return (
		<ul className={`gap-4 ${className}`}>
			{photos.map((photo) => (
				<li key={photo.id} className="mb-4 break-inside-avoid">
					<Link
						{...linkTo(photo.id)}
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
							<Owner owner={photo.owner} light plain />
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}
