/** Toneflix Photos colours and type, matching the web app's tokens in apps/web/app/app.css. */
export const colors = {
  white: '#ffffff',
  black: '#000000',

  canvas: '#f4f7fc',
  surface50: '#ffffff',
  surface100: '#e8effa',
  surface200: '#d5deea',
  surface300: '#b9c6d8',

  ink500: '#5f6c80',
  ink700: '#344157',
  ink900: '#111c33',

  brand50: '#e5f5ff',
  brand100: '#c2e9ff',
  brand200: '#85d4ff',
  brand300: '#3dbdff',
  brand400: '#00e1ff',
  brand500: '#00a6ff',
  brand600: '#0085f0',
  brand700: '#0064d6',
  brand800: '#0046a3',

  gold50: '#fff8dc',
  gold100: '#ffeda3',
  gold200: '#ffe066',
  gold300: '#ffd22e',
  gold400: '#ffc300',
  gold500: '#e6a800',
  gold600: '#bb8c01',
  gold700: '#8c6901',

  red50: '#fef2f2',
  red200: '#fecaca',
  red600: '#dc2626',
  red700: '#b91c1c',
  red800: '#991b1b',

  emerald50: '#ecfdf5',
  emerald200: '#a7f3d0',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald900: '#064e3b',

  amber50: '#fffbeb',
  amber200: '#fde68a',
  amber700: '#b45309',
  amber900: '#78350f',
} as const

export const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'PlusJakartaSans_700Bold',
  displayHeavy: 'PlusJakartaSans_800ExtraBold',
  serif: 'Fraunces_500Medium',
  serifItalic: 'Fraunces_400Regular_Italic',
} as const

export const radius = {
  md: 8,
  field: 10,
  lg: 12,
  xl: 16,
  full: 999,
} as const

/** The logo's blue sweep, as gradient stops. */
export const brandSweep = [colors.brand500, colors.brand400] as const

/** Flat containers and fields: firm 1.5px edges, no shadows. */
export const surfaces = {
  panel: { borderWidth: 1.5, borderColor: colors.surface200, borderRadius: radius.xl, backgroundColor: colors.surface50 },
  field: { borderWidth: 1.5, borderColor: colors.surface300, borderRadius: radius.field, backgroundColor: colors.surface50 },
  fieldFocused: { borderColor: colors.brand600, boxShadow: `inset 0 0 0 1px ${colors.brand600}` },
  backdrop: 'rgba(17,28,51,0.6)',
} as const
