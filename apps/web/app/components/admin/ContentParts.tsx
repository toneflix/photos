import { Form } from "react-router";
import type { ModerationItem } from "@photos/types";
import { Button } from "~/components/ui";

/** Asks first, then takes the item off Explore. Posts to the page it is on. */
export function UnpublishButton({ item, busy, action }: { item: Pick<ModerationItem, "id" | "title">; busy: boolean; action?: string }) {
	return (
		<Form
			method="post"
			action={action}
			preventScrollReset
			onSubmit={(event) => {
				if (!confirm(`Take “${item.title}” off Explore? It becomes private for its owner.`)) event.preventDefault();
			}}
		>
			<input type="hidden" name="id" value={item.id} />
			<Button type="submit" variant="danger" disabled={busy} className="!py-2">
				{busy ? "Taking down…" : "Take off Explore"}
			</Button>
		</Form>
	);
}
