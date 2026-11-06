import type { Href } from 'expo-router'
import type { Visibility } from '@photos/types'

/** Every settings screen, grouped the way the account tab lists them. Mirrors the web's settings nav. */
export const SETTINGS_GROUPS: { label: string; pages: { to: Href; label: string; hint: string; danger?: boolean }[] }[] = [
  {
    label: 'Account',
    pages: [
      { to: '/settings/profile', label: 'Profile', hint: 'Your name and photo' },
      { to: '/settings/email', label: 'Email', hint: 'Your address and confirming it' },
      { to: '/settings/plan', label: 'Plan', hint: 'What your account includes and payments' },
    ],
  },
  {
    label: 'Security',
    pages: [
      { to: '/settings/password', label: 'Password', hint: 'Change the password you sign in with' },
      { to: '/settings/two-step', label: 'Two-step sign-in', hint: 'A code from your phone after your password' },
      { to: '/settings/devices', label: 'Devices', hint: "Where you're signed in" },
    ],
  },
  {
    label: 'Privacy',
    pages: [
      { to: '/settings/sharing', label: 'Sharing', hint: 'Who can open your books' },
      { to: '/settings/data', label: 'Your data', hint: "Download everything you've kept" },
      { to: '/settings/delete-account', label: 'Delete account', hint: 'Remove your account for good', danger: true },
    ],
  },
]

export const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
  { value: 'private', label: 'Only me', hint: 'Nobody else can open new books until you share them.' },
  { value: 'shared', label: 'Anyone with the link', hint: 'New books open for people you send the link to.' },
  { value: 'public', label: 'Public', hint: 'New books are open to everyone with the link, and can be listed later.' },
]
