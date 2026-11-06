/** Every settings page, grouped the way the settings home and sidebar list them. */
export const SETTINGS_GROUPS = [
	{
		label: "Account",
		pages: [
			{ to: "/settings/profile", label: "Profile", hint: "Your name and photo" },
			{ to: "/settings/email", label: "Email", hint: "Your address and confirming it" },
			{ to: "/settings/plan", label: "Plan", hint: "What your account includes and payments" },
		],
	},
	{
		label: "Security",
		pages: [
			{ to: "/settings/password", label: "Password", hint: "Change the password you sign in with" },
			{ to: "/settings/two-step", label: "Two-step sign-in", hint: "A code from your phone after your password" },
			{ to: "/settings/devices", label: "Devices", hint: "Where you're signed in" },
		],
	},
	{
		label: "Privacy",
		pages: [
			{ to: "/settings/sharing", label: "Sharing", hint: "Who can open your books" },
			{ to: "/settings/data", label: "Your data", hint: "Download everything you've kept" },
			{ to: "/settings/delete-account", label: "Delete account", hint: "Remove your account for good", danger: true },
		],
	},
] as const;

export type SettingsPageLink = (typeof SETTINGS_GROUPS)[number]["pages"][number];
