import type { DocumentType } from '@app/models/Document'

export interface DocumentSeed {
  slug: string
  type: DocumentType
  title: string
  summary: string
  sort: number
  body: string
}

/** The privacy policy, terms of use and about page, written for the app as it works today. */
export const DOCUMENTS: DocumentSeed[] = [
  {
    slug: 'about',
    type: 'page',
    title: 'About Toneflix Photos',
    summary: 'Beautiful photos, taken by beautiful people.',
    sort: 0,
    body: `
Love photos? Browse beautiful photos, share your own, and turn your favourites into photobooks, on the web and on your phone.

## Explore

Explore is a timeline of photos, photobooks and spaces that people chose to share with everyone. Scroll through it, open anything that catches your eye, and follow a photo back to the person who took it. You don't need an account to look around.

## Share your photos

Upload your photos and give each one a title, a description and a licence. Photos are "All rights reserved" by default, so people can look but not download. Pick a Creative Commons licence when you're happy for others to download and use your work. Keep a photo to yourself, or put it on Explore for everyone.

## Spaces

A space holds the photos and photobooks from one part of your life: an event, a trip, a project or a year. Spaces are private until you make them public, and you choose who you invite in and what they can do.

## Photobooks

Turn any set of photos into a photobook you read page by page, like a printed album.

- Pick a cover and lay out each page: full-bleed, framed, pairs, grids or a page of words.
- Print it on ivory, white, kraft or charcoal paper.
- Turn the pages with a swipe on your phone, or with your mouse or keyboard on a computer. On a phone, turn it sideways to read it like an open album.
- Keep a photobook to yourself, share a link, or lock it with codes. Each code lets people view it, add photos, edit it or take it over.

## Your profile

Your profile shows the photos, photobooks and spaces you share, under your own username. You can keep your name off what you share if you'd rather not have a public profile.

## Free and Premium

Toneflix Photos is free to use. Premium gives you more room for your photos, larger downloads, your own branding on your photobooks, insights on how often each photobook is opened, and photobooks you can hand over to someone else.

## Who makes it

Toneflix Photos is made by [Toneflix](https://toneflix.net), the team behind Toneflix Music.
`,
  },
  {
    slug: 'privacy',
    type: 'policy',
    title: 'Privacy policy',
    summary: 'What Toneflix Photos collects, why, who sees it, and the choices you have.',
    sort: 1,
    body: `
This policy explains what Toneflix Photos collects when you use it, why, and what you can do about it. Toneflix Photos is run by Toneflix ("we", "us").

## What we collect

**Your account.** Your name, email address, username and profile photo. Your password is stored scrambled, so nobody can read it, us included.

**What you add.** Your photos and the details you give them, your books, spaces, access codes, and the people you invite into a space.

**How you sign in.** For each device you sign in on, we keep its name, browser and IP address, and when it was last used. If you turn on two-step sign-in, we keep the secret your authenticator app uses and your recovery codes.

**Views and downloads.** We count views and downloads of photos, books and spaces. To count each visitor once in a while, we briefly note their account or IP address. Your own views of your own work don't count.

**Payments.** When you pay for a plan, we keep the plan, amount, currency and payment reference. Card and bank details go straight to our payment provider, Flutterwave. We never see or keep them.

**Cookies.** On the web we use a cookie to keep you signed in and one to remember the book codes you've entered. We don't use advertising or tracking cookies.

## How we use it

- To run your account and show your photos and books to the people you choose.
- To send you emails you need, like confirming your address, resetting your password and space invites.
- To keep the app working fairly, for example by limiting repeated sign-in attempts.
- To show you, and anyone you allow, how many people viewed and downloaded your work.
- To take payments and apply the plan you paid for.

We don't sell your information, and we don't use it for advertising.

## Who sees what

- **Your photos and books start private.** Only you can see them until you share them.
- **Explore is public.** Anything you put on Explore, and your profile page, can be seen by anyone. Your name shows on your public work unless you turn it off in Sharing settings.
- **Codes and links.** Anyone with a book's link or code can open it in the way that code allows.
- **Spaces.** People you invite into a space see what's in it.
- **View counts** show to visitors only if you turn them on in Sharing settings.
- **Our team** can see accounts and public work to answer questions, take down things that break our terms, and keep the app running.

## Who we share it with

We use a few providers to run Toneflix Photos: hosting and file storage for the app and your photos, email delivery, and Flutterwave for payments. They only get what they need to do that job. We may also share information when the law requires it.

## Your choices

- **Get a copy.** Download all your photos, books and account details from Settings → Your data.
- **Change what's shown.** Make any photo, book or space private again, change its licence, or hide your name and counts in Sharing settings.
- **Sign out devices.** See where you're signed in and sign out any device from Settings → Devices.
- **Delete your account.** Settings → Delete account removes your account, photos, books and files for good.

## Children

Toneflix Photos is not meant for children under 13. If you believe a child has made an account, contact us and we will remove it.

## Changes

If we change this policy, we'll update the date on this page. If a change is important, we'll tell you by email or in the app.
`,
  },
  {
    slug: 'terms',
    type: 'policy',
    title: 'Terms of use',
    summary: 'The rules for using Toneflix Photos.',
    sort: 2,
    body: `
These terms are the agreement between you and Toneflix ("we", "us") for using Toneflix Photos on the web and on your phone. By making an account or using the app, you agree to them. Our [privacy policy](/privacy) explains how we handle your information.

## Your account

- Give your real name and an email address you can open.
- Keep your password to yourself. You're responsible for what happens in your account.
- You must be at least 13, and old enough where you live to agree to these terms.

## Your photos and books

**They're yours.** You keep every right you have in what you upload. You let us store it, process it (for example, making smaller copies to show on screens) and show it to the people you choose, only to run Toneflix Photos.

**Licences.** Every photo is "All rights reserved" unless you choose a Creative Commons licence. Photos you keep all rights to can't be downloaded by others. Once someone downloads a photo under a Creative Commons licence, that licence can't be taken back from them. See [photo licences](/licenses).

**Only share what you may.** Upload only photos you took or have permission to share, and get permission from people in them where it's needed.

## Sharing books

- An access code opens a book for whoever has it, with the permissions you gave it: view, add photos, edit, or transfer.
- A transfer code lets someone take over a book. They get it and its photos in their own account. The book still carries the branding of the person who made it.
- You can change or revoke a code at any time. People who already copied or downloaded photos may keep those copies.

## Spaces

You can invite people into your spaces and choose what each person may do. You're responsible for who you invite.

## What's not allowed

- Anything illegal, or photos of people shared without their consent where it's needed.
- Sexual content involving minors, content that promotes violence or hate, and harassment.
- Getting around download blocks, access codes or plan limits, or collecting other people's photos in bulk.
- Disrupting the app, sending it automated traffic, or breaking into accounts.

We may take public work off Explore, remove content, or suspend accounts that break these rules.

## Plans and payments

- The Free plan costs nothing. Paid plans add more room and features, as listed on the [pricing page](/pricing).
- Prices are shown before you pay, in your local currency where we support it. Payments are handled by Flutterwave.
- Paid time lasts for the period you paid for. When it ends, your account moves to the Free plan and its limits apply.

## Ending your account

You can delete your account at any time from Settings → Delete account. This removes your photos, books and files for good. Download a copy first if you want one. We may close accounts that break these terms.

## Our service

We work to keep Toneflix Photos running and your work available, but the app is provided as it is, and we can't promise it will never be interrupted. Keep your own copies of photos that matter to you. As far as the law allows, we aren't liable for losses that come from using the app.

## Changes

We may update these terms as the app changes. We'll update the date on this page, and tell you by email or in the app when a change is important. If you keep using Toneflix Photos after that, the new terms apply.
`,
  },
]
