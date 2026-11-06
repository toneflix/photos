import { useEffect } from "react";
import { formatMoney } from "@photos/types";
import { Link, useRevalidator } from "react-router";
import { buttonClass, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/checkout-complete";

export const meta = () => [{ title: "Payment · Toneflix Photos" }, { name: "robots", content: "noindex" }];

/** Flutterwave sends payers back here. The payment is checked with Flutterwave before it counts. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const reference = new URL(request.url).searchParams.get("reference") ?? new URL(request.url).searchParams.get("tx_ref");

	if (!reference) throw new Response("Not found", { status: 404 });

	try {
		return { payment: (await api.payments.verify(reference)).data, error: null };
	} catch (error) {
		return { payment: null, error: formError(error).error };
	}
}

/** Checks a pending payment again a few times, since Flutterwave can take a moment to confirm it. */
function useRecheck(pending: boolean) {
	const revalidator = useRevalidator();

	useEffect(() => {
		if (!pending) return;

		const timer = window.setTimeout(() => revalidator.revalidate(), 4000);

		return () => window.clearTimeout(timer);
	}, [pending, revalidator]);
}

export default function CheckoutComplete({ loaderData }: Route.ComponentProps) {
	const { payment, error } = loaderData;

	useRecheck(payment?.status === "pending");

	const content = !payment
		? { title: "We couldn't find this payment", body: error ?? "Check your plan in settings to see if it went through.", tone: "warn" }
		: payment.status === "complete"
			? { title: "You're all set", body: `${payment.title} is yours. Thanks for supporting Toneflix Photos.`, tone: "good" }
			: payment.status === "rejected"
				? {
						title: "This payment didn't go through",
						body: "Nothing was added to your plan. If you were charged, Flutterwave returns it, or contact us with the reference below.",
						tone: "warn",
					}
				: {
						title: "Confirming your payment",
						body: "This page updates as soon as Flutterwave confirms it. You can leave it; your plan updates either way.",
						tone: "wait",
					};

	return (
		<main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
			<div className="panel p-8 text-center">
				<div
					className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
						content.tone === "good" ? "bg-emerald-50 text-emerald-700" : content.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700"
					}`}
				>
					{content.tone === "wait" ? (
						<Spinner className="h-6 w-6" />
					) : (
						<svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
							{content.tone === "good" ? (
								<path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
							) : (
								<path d="M10 6v5M10 14h.01" strokeLinecap="round" />
							)}
						</svg>
					)}
				</div>
				<h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900">{content.title}</h1>
				<p className="mt-3 text-ink-500">{content.body}</p>
				{payment && (
					<p className="mt-5 text-sm text-ink-500">
						{formatMoney(payment.chargeAmount, payment.chargeCurrency)} · Reference {payment.reference}
					</p>
				)}
				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<Link prefetch="intent" to="/settings/plan" className={buttonClass("primary")}>
						See your plan
					</Link>
					{payment?.status === "rejected" && (
						<Link prefetch="intent" to="/pricing" className={buttonClass("secondary")}>
							Try again
						</Link>
					)}
				</div>
			</div>
		</main>
	);
}
