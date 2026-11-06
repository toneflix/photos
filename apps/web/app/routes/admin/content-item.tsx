import { Link, redirect, useNavigation } from "react-router";
import type { PhotoLicense } from "@photos/types";
import { licenseFor } from "~/lib/licenses";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { UnpublishButton } from "~/components/admin/ContentParts";
import { RANGES, RangePicker, StatTiles, StatsChart } from "~/components/stats/StatsChart";
import { contentKind, publicLink } from "~/components/admin/content";
import { Alert, buttonClass } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/content-item";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.item.title ?? "Item"} · Admin · Toneflix Photos` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "content.moderate");
	const days = RANGES.find((range) => range === Number(new URL(request.url).searchParams.get("days"))) ?? 30;
	const kind = contentKind(request.url);
	const { data } = await api.admin.moderationItem(kind.kind, params.id, days);

	return { kind, days, item: data };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "content.moderate");
	const { kind } = contentKind(request.url);

	try {
		await api.admin.unpublish(kind, params.id);
	} catch (error) {
		return { error: formError(error).error };
	}

	return redirect(`/admin/${kind}`);
}

const number = new Intl.NumberFormat("en");
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Unknown");

export default function AdminContentItem({ loaderData, actionData }: Route.ComponentProps) {
	const { kind, days, item } = loaderData;
	const navigation = useNavigation();
	const address = item.details.find((detail) => detail.label === "Address")?.value;
	const open = publicLink(item, address?.split("/").pop());

	return (
		<>
			<AdminHeader title={item.title} description={`A public ${kind.one} on Explore since ${date(item.publishedAt)}.`} back={{ to: `/admin/${kind.kind}`, label: `All ${kind.label.toLowerCase()}` }}>
				{open && (
					<Link to={open} target="_blank" rel="noreferrer" className={buttonClass("secondary", "!py-2")}>
						Open
					</Link>
				)}
				<UnpublishButton item={item} busy={navigation.state === "submitting"} />
			</AdminHeader>
			<div className="space-y-6 px-4 py-8 sm:px-8">
				{actionData?.error && <Alert>{actionData.error}</Alert>}

				<StatTiles
					items={[
						{ label: "Views", value: number.format(item.viewCount), note: "All time" },
						...(item.downloadCount === null ? [] : [{ label: "Downloads", value: number.format(item.downloadCount), note: "All time" }]),
						{ label: "Owner", value: item.owner?.name ?? "Unknown", note: item.owner?.email },
					]}
				/>

				<div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
					<div className="space-y-3">
						<RangePicker days={days} />
						<StatsChart days={item.daily} title={`Last ${days} days`} downloads={item.downloadCount !== null} />
					</div>

					<aside className="panel overflow-hidden">
						{item.imageUrl && <img src={item.imageUrl} alt="" className="aspect-[4/3] w-full bg-surface-100 object-cover" />}
						<dl className="divide-y divide-surface-200 text-sm">
							{[...item.details, { label: "Created", value: date(item.createdAt) }].map((detail) => (
								<div key={detail.label} className="flex justify-between gap-4 px-5 py-3">
									<dt className="text-ink-500">{detail.label}</dt>
									<dd className="text-right font-medium break-all text-ink-900">{detail.label === "Licence" ? licenseFor(detail.value as PhotoLicense).label : detail.value}</dd>
								</div>
							))}
							{item.owner && (
								<div className="px-5 py-3">
									<Link prefetch="intent" to={`/admin/users/${item.owner.id}`} className="font-semibold text-brand-700 hover:underline">
										See {item.owner.name}’s account
									</Link>
								</div>
							)}
						</dl>
					</aside>
				</div>
			</div>
		</>
	);
}
