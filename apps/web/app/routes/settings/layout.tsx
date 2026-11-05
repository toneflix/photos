import { NavLink, Outlet } from "react-router";

const sections = [
	{ to: "/settings/profile", label: "Profile", hint: "Name, photo and email" },
	{ to: "/settings/security", label: "Sign-in & security", hint: "Password, two-step sign-in, devices" },
	{ to: "/settings/privacy", label: "Privacy & data", hint: "Sharing defaults, download, delete" },
];

export default function SettingsLayout() {
	return (
		<main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
			<h1 className="font-serif text-4xl text-ink-900">Settings</h1>
			<div className="mt-8 grid gap-8 md:grid-cols-[15rem_1fr]">
				<nav className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0" aria-label="Settings">
					{sections.map((section) => (
						<NavLink
							key={section.to}
							to={section.to}
							className={({ isActive }) =>
								`shrink-0 rounded-2xl px-4 py-2.5 transition md:py-3 ${
									isActive ? "bg-ink-900 text-paper-50" : "text-ink-700 hover:bg-paper-200/70"
								}`
							}
						>
							{({ isActive }) => (
								<>
									<span className="block text-sm font-medium">{section.label}</span>
									<span className={`hidden text-xs md:block ${isActive ? "text-paper-200" : "text-ink-500"}`}>{section.hint}</span>
								</>
							)}
						</NavLink>
					))}
				</nav>
				<div className="min-w-0 space-y-6">
					<Outlet />
				</div>
			</div>
		</main>
	);
}
