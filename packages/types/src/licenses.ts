import type { PhotoLicense } from './models'

export interface LicenseInfo {
  value: PhotoLicense
  /** Plain-words name for pickers and badges. */
  label: string
  /** The licence's formal name. */
  name: string
  /** What visitors may do, in one sentence. */
  summary: string
  /** What creators are agreeing to, in one sentence. */
  forCreators: string
  downloadable: boolean
  credit: boolean
  url?: string
}

/** The licences a photographer can pick. Only open licences can be downloaded. */
export const LICENSES: LicenseInfo[] = [
  {
    value: 'all-rights-reserved',
    label: 'All rights reserved',
    name: 'All rights reserved',
    summary: "You can view it here. Copying, downloading or reusing it needs the photographer's permission.",
    forCreators: "People can only look at it on Toneflix Photos. There's no download button.",
    downloadable: false,
    credit: false,
  },
  {
    value: 'cc-by',
    label: 'Free to use with credit',
    name: 'CC BY 4.0',
    summary: 'Anyone can download, share and adapt it, even commercially, as long as they credit the photographer.',
    forCreators: 'Anyone can download and reuse it, even commercially, but must credit you.',
    downloadable: true,
    credit: true,
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    value: 'cc-by-nc',
    label: 'Free for non-commercial use',
    name: 'CC BY-NC 4.0',
    summary: 'Anyone can download, share and adapt it for non-commercial use, as long as they credit the photographer.',
    forCreators: 'Anyone can download and reuse it, but not to make money, and must credit you.',
    downloadable: true,
    credit: true,
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
  {
    value: 'cc0',
    label: 'Free to use, no credit needed',
    name: 'CC0 1.0',
    summary: "The photographer gave up their rights. Anyone can use it for anything, no credit needed (though it's kind).",
    forCreators: 'You give up your rights to it. Anyone can use it for anything, without credit.',
    downloadable: true,
    credit: false,
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
]

export const licenseFor = (value: PhotoLicense | null | undefined): LicenseInfo => LICENSES.find((license) => license.value === value) ?? LICENSES[0]

/** A ready-to-paste credit line for a photo. */
export function creditLine(photo: { caption: string | null; owner: { name: string | null } }, license: LicenseInfo): string {
  const title = photo.caption ? `"${photo.caption}"` : 'Photo'
  const by = photo.owner.name ?? 'a Toneflix Photos member'

  return `${title} by ${by} on Toneflix Photos, ${license.value === 'cc0' ? 'dedicated to the public domain' : 'licensed under'} ${license.name}`
}
