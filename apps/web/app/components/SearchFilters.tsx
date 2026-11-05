import { useRef } from "react";
import {
  Form,
  Link,
  useLocation,
  useNavigation,
  useSubmit,
} from "react-router";

export interface FilterField {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * A search box with filter dropdowns that live in the URL, so results can be
 * shared and survive a reload. Changing a filter searches straight away.
 */
export function SearchFilters({
  placeholder,
  filters,
}: {
  placeholder: string;
  filters: FilterField[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const busy = useNavigation().state === "loading";
  const submit = useSubmit();
  const active = ["q", ...filters.map((field) => field.name)].some((key) =>
    params.get(key),
  );

  return (
    <Form
      ref={form}
      method="get"
      action={pathname}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();

        // Leave "any" filters out of the URL so links stay short.
        const query = new URLSearchParams();

        for (const [key, value] of new FormData(event.currentTarget))
          if (String(value).trim()) query.set(key, String(value).trim());

        submit(query, { method: "get", action: pathname });
      }}
    >
      <label className="relative block flex-1">
        <span className="sr-only">{placeholder}</span>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-ink-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          key={params.get("q") ?? ""}
          type="search"
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder={placeholder}
          maxLength={100}
          className={`block w-full rounded-full border border-surface-300 bg-surface-100 py-3 pr-4 pl-12 text-ink-900 transition placeholder:text-ink-500 hover:border-ink-500 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none ${busy ? "opacity-70" : ""}`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((field) => (
          <label key={field.name} className="relative">
            <span className="sr-only">{field.label}</span>
            <select
              key={params.get(field.name) ?? ""}
              name={field.name}
              defaultValue={params.get(field.name) ?? ""}
              onChange={() => form.current?.requestSubmit()}
              className={`cursor-pointer appearance-none rounded-full border py-2.5 pr-9 pl-4 text-sm font-semibold transition ${
                params.get(field.name)
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-surface-300 bg-white text-ink-700 hover:border-ink-500"
              }`}
            >
              {field.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-white text-ink-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              className={`pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 ${params.get(field.name) ? "text-white" : "text-ink-500"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                d="m6 9 6 6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </label>
        ))}
        {active && (
          <Link
            to={pathname}
            className="px-2 text-sm font-medium text-ink-500 hover:text-ink-900"
          >
            Clear
          </Link>
        )}
        <button type="submit" className="sr-only">
          Search
        </button>
      </div>
    </Form>
  );
}

/** Read a search or filter value from the URL, keeping only allowed values. */
export function filterParam<T extends string>(
  url: URL,
  name: string,
  allowed: readonly T[],
): T | undefined {
  const value = url.searchParams.get(name);

  return allowed.includes(value as T) ? (value as T) : undefined;
}

/** The trimmed search text from the URL, if any. */
export function searchText(url: URL): string | undefined {
  return url.searchParams.get("q")?.trim().slice(0, 100) || undefined;
}

export const ORIENTATION_FILTER: FilterField = {
  name: "orientation",
  label: "Shape",
  options: [
    { value: "", label: "Any shape" },
    { value: "landscape", label: "Landscape" },
    { value: "portrait", label: "Portrait" },
    { value: "square", label: "Square" },
  ],
};

export const THEME_FILTER: FilterField = {
  name: "theme",
  label: "Cover",
  options: [
    { value: "", label: "Any cover" },
    { value: "classic", label: "Classic leather" },
    { value: "linen", label: "Linen" },
    { value: "midnight", label: "Midnight" },
  ],
};

export const SORT_FILTER: FilterField = {
  name: "sort",
  label: "Order",
  options: [
    { value: "", label: "Newest" },
    { value: "oldest", label: "Oldest" },
  ],
};

export const PHOTO_VISIBILITY_FILTER: FilterField = {
  name: "visibility",
  label: "Visibility",
  options: [
    { value: "", label: "All photos" },
    { value: "private", label: "Private" },
    { value: "public", label: "On Explore" },
  ],
};

export const BOOK_VISIBILITY_FILTER: FilterField = {
  name: "visibility",
  label: "Visibility",
  options: [
    { value: "", label: "All books" },
    { value: "private", label: "Private" },
    { value: "shared", label: "Shared by link" },
    { value: "public", label: "Public" },
  ],
};
