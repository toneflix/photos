/** Toneflix Photos colours and type, matching the web app's tokens in apps/web/app/app.css. */
export const colors = {
  white: '#ffffff',
  black: '#000000',

  surface50: '#ffffff',
  surface100: '#f7f7f7',
  surface200: '#ededed',
  surface300: '#dfdfe0',

  ink500: '#7f7f7f',
  ink700: '#4a4d52',
  ink900: '#2c343e',

  brand50: '#e6f7ff',
  brand100: '#c6edff',
  brand400: '#00eaff',
  brand500: '#00afff',
  brand700: '#006ea6',
  brand800: '#00537d',

  gold50: '#fff9e1',
  gold300: '#fdd236',
  gold400: '#f6c101',
  gold600: '#bb8c01',

  red50: '#fef2f2',
  red200: '#fecaca',
  red700: '#b91c1c',
  red800: '#991b1b',

  emerald50: '#ecfdf5',
  emerald200: '#a7f3d0',
  emerald900: '#064e3b',

  amber50: '#fffbeb',
  amber200: '#fde68a',
  amber900: '#78350f',
} as const

export const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'PlusJakartaSans_700Bold',
  displayHeavy: 'PlusJakartaSans_800ExtraBold',
} as const

export const radius = {
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const

/** The logo's blue sweep, as gradient stops. */
export const brandSweep = [colors.brand500, colors.brand400] as const
