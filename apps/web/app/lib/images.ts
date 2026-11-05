/** Read an image file's pixel size in the browser, or null if it can't be decoded. */
export async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
	try {
		if ("createImageBitmap" in window) {
			const bitmap = await createImageBitmap(file);
			const size = { width: bitmap.width, height: bitmap.height };
			bitmap.close();
			return size;
		}
	} catch {
		// Fall through to <img>, e.g. for formats createImageBitmap rejects.
	}

	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
			URL.revokeObjectURL(url);
		};
		img.onerror = () => {
			resolve(null);
			URL.revokeObjectURL(url);
		};
		img.src = url;
	});
}

export const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif";
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
