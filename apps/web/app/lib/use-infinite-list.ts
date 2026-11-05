import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

export interface ListPage<T> {
	items: T[];
	page: number;
	lastPage: number;
}

/**
 * Appends the next page of a route's loader data whenever the returned sentinel
 * ref scrolls into view. The list restarts from the first page when the route revalidates.
 */
export function useInfiniteList<T>(first: ListPage<T>, path: string) {
	const fetcher = useFetcher<ListPage<T>>();
	const sentinel = useRef<HTMLDivElement>(null);
	const [items, setItems] = useState(first.items);
	const [page, setPage] = useState(first.page);
	const [lastPage, setLastPage] = useState(first.lastPage);

	useEffect(() => {
		setItems(first.items);
		setPage(first.page);
		setLastPage(first.lastPage);
	}, [first]);

	useEffect(() => {
		const next = fetcher.data;

		if (!next || next.page !== page + 1) return;

		setItems((current) => [...current, ...next.items]);
		setPage(next.page);
		setLastPage(next.lastPage);
	}, [fetcher.data, page]);

	const hasMore = page < lastPage;
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		const node = sentinel.current;

		if (!node || !hasMore) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && fetcher.state === "idle") fetcher.load(`${path}?page=${page + 1}`);
			},
			{ rootMargin: "600px 0px" },
		);
		observer.observe(node);

		return () => observer.disconnect();
	}, [hasMore, page, path, fetcher]);

	return { items, hasMore, loading, sentinel };
}
