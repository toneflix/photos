import { type ReactNode, useEffect } from "react";
import { data, useFetcher } from "react-router";
import { PAGE_LAYOUTS, PAGE_SHAPES, pageAspect, type DesignKind, type DesignRestriction, type FrameStyle, type PageLayout, type PageShape } from "@photos/types";
import { PrintedPhoto } from "@toneflix/flipbook-react";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { LayoutSketch } from "~/components/book/LayoutPicker";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import { toast } from "~/lib/toast";
import type { Route } from "./+types/designs";

export const meta = () => [{ title: "Book designs · Admin · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "plans.manage");
	const [{ data: kinds }, { data: plans }] = await Promise.all([api.admin.designs(), api.admin.plans()]);

	return { kinds, plans: plans.map(({ id, name, active }) => ({ id, name, active })) };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "plans.manage");
	const { kind, design, planIds } = (await request.json()) as { kind: DesignKind; design: string; planIds: string[] | null };

	try {
		await api.admin.restrictDesign(kind, design, planIds);

		return { message: null, error: null };
	} catch (error) {
		return data({ message: null, ...formError(error) }, { status: 422 });
	}
}

type PlanOption = Route.ComponentProps["loaderData"]["plans"][number];

/** Every page layout and frame, each on every plan until admins keep it to some. */
export default function AdminDesigns({ loaderData }: Route.ComponentProps) {
	const { kinds, plans } = loaderData;

	return (
		<>
			<AdminHeader title="Book designs" description="Choose which plans can use each page layout and frame. A design is on every plan until you pick plans for it." />
			<div className="space-y-8 px-4 py-6 sm:px-8">
				{kinds.map((group) => (
					<section key={group.kind} aria-labelledby={`designs-${group.kind}`}>
						<h2 id={`designs-${group.kind}`} className="font-display text-xl font-bold tracking-tight text-ink-900">
							{group.title}
						</h2>
						<ul className="panel mt-3 divide-y-[1.5px] divide-surface-200">
							{group.designs.map((design) => (
								<DesignRow key={design.key} kind={group.kind} design={design} plans={plans} />
							))}
						</ul>
					</section>
				))}
			</div>
		</>
	);
}

/** One design with a switch for every plan. Saves on each change. */
function DesignRow({ kind, design, plans }: { kind: DesignKind; design: DesignRestriction; plans: PlanOption[] }) {
	const fetcher = useFetcher<typeof action>();
	const pending = fetcher.json as { planIds: string[] | null } | undefined;
	const planIds = pending ? pending.planIds : design.planIds;
	const everyPlan = planIds === null;

	const save = (next: string[] | null) =>
		fetcher.submit({ kind, design: design.key, planIds: next }, { method: "post", encType: "application/json" });
	const toggle = (id: string) => {
		const current = planIds ?? plans.map((plan) => plan.id);

		save(current.includes(id) ? current.filter((other) => other !== id) : [...current, id]);
	};

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.error) toast.error(fetcher.data.error, { id: `${kind}:${design.key}` });
	}, [fetcher.state, fetcher.data, kind, design.key]);

	return (
		<li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 items-center gap-3">
				<DesignPreview kind={kind} design={design.key} />
				<div className="min-w-0">
					<p className="font-semibold text-ink-900">{design.label}</p>
					<p className="text-xs text-ink-500">{everyPlan ? "On every plan" : planIds.length ? `On ${planIds.length} of ${plans.length} plans` : "On no plan"}</p>
				</div>
			</div>
			<div className="flex flex-wrap gap-1.5" role="group" aria-label={`Plans with ${design.label}`}>
				<Chip on={everyPlan} onClick={() => save(null)}>
					Every plan
				</Chip>
				{plans.map((plan) => (
					<Chip key={plan.id} on={everyPlan || planIds.includes(plan.id)} muted={everyPlan} onClick={() => toggle(plan.id)}>
						{plan.name}
						{!plan.active && <span className="text-ink-500"> (off)</span>}
					</Chip>
				))}
			</div>
		</li>
	);
}

function Chip({ on, muted = false, onClick, children }: { on: boolean; muted?: boolean; onClick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={onClick}
			className={`rounded-full border-[1.5px] px-3 py-1 text-sm font-medium transition-colors ${
				on
					? muted
						? "border-brand-200 bg-brand-50 text-brand-700"
						: "border-brand-600 bg-brand-600 text-white"
					: "border-surface-200 bg-white text-ink-700 hover:border-surface-300"
			}`}
		>
			{children}
		</button>
	);
}

/** A page sketch for a layout, an outline for a page shape, a framed placeholder for a frame. */
function DesignPreview({ kind, design }: { kind: DesignKind; design: string }) {
	if (kind === "shape") {
		if (!(design in PAGE_SHAPES)) return null;

		return (
			<span className="flex h-12 w-12 shrink-0 items-center justify-center">
				<span
					className={`block rounded-[3px] border-2 border-surface-300 bg-surface-100 ${pageAspect(design as PageShape) < 1 ? "h-11" : "w-11"}`}
					style={{ aspectRatio: pageAspect(design as PageShape) }}
				/>
			</span>
		);
	}

	if (kind === "layout") {
		if (!(design in PAGE_LAYOUTS)) return null;

		return (
			<span className="flex aspect-[3/4] w-9 shrink-0 items-center justify-center rounded-[5px] border-2 border-surface-200 bg-surface-100 text-ink-500">
				<LayoutSketch layout={design as PageLayout} className="h-full w-full" />
			</span>
		);
	}

	return (
		<span className="fb-paper fb-paper-ivory relative block aspect-square w-12 shrink-0 overflow-hidden rounded-md ring-2 ring-black/5" style={{ containerType: "size" }}>
			<span className="absolute inset-[12%]">
				<PrintedPhoto photo={null} frame={design as FrameStyle} scale={3} show={false} />
			</span>
		</span>
	);
}
