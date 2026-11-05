import type { LicenseInfo } from "@photos/types";

export { LICENSES, creditLine, licenseFor, type LicenseInfo } from "@photos/types";

/** Props that discourage saving a photo whose owner keeps all rights. A deterrent only: screenshots can't be stopped. */
export const guardImage = (license: LicenseInfo) =>
	license.downloadable ? {} : { draggable: false, onContextMenu: (event: { preventDefault(): void }) => event.preventDefault() };
