/** The heading across the top of an admin page. */
export function AdminHeader({ title, description }: { title: string; description: string }) {
	return (
		<header className="border-b-[1.5px] border-surface-200 bg-white px-4 py-6 sm:px-8">
			<h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
			<p className="mt-1 text-ink-500">{description}</p>
		</header>
	);
}
