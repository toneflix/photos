import type { User } from "@photos/types";

const sizes = {
	sm: "h-9 w-9 text-sm",
	lg: "h-20 w-20 text-2xl",
};

/** The user's profile photo, or their initials on an ember circle. */
export function Avatar({ user, size = "sm" }: { user: Pick<User, "name" | "avatarUrl">; size?: keyof typeof sizes }) {
	if (user.avatarUrl) {
		return <img src={user.avatarUrl} alt="" className={`${sizes[size]} shrink-0 rounded-full object-cover`} />;
	}

	return (
		<span className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-ember-500 font-semibold text-white`}>
			{initials(user.name)}
		</span>
	);
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}
