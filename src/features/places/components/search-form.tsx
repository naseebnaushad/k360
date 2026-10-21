import { Search } from "lucide-react";
import Form from "next/form";

import { SEARCH_QUERY_MAX_LENGTH, SEARCH_QUERY_MIN_LENGTH } from "../schemas";

interface SearchFormProps {
  /** The current query, shown in the box. */
  query?: string;
  /** Hidden fields that keep other filters applied while searching. */
  keep?: Record<string, string | string[] | undefined>;
  placeholder?: string;
  size?: "default" | "large";
  id?: string;
}

/** Plain GET form: works without JavaScript and navigates client-side when it is available. */
export function SearchForm({
  query,
  keep = {},
  placeholder = "Search places, shops and services",
  size = "default",
  id = "search",
}: SearchFormProps) {
  const large = size === "large";
  const hidden = Object.entries(keep).flatMap(([name, value]) =>
    value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((v) => [name, v]),
  );

  return (
    <Form action="/places" role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search places
      </label>
      <Search
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${
          large ? "left-5 size-5" : "left-4 size-4"
        }`}
      />
      <input
        // Re-mount when the query changes so the box reflects the URL.
        key={query ?? ""}
        id={id}
        name="q"
        type="search"
        defaultValue={query}
        placeholder={placeholder}
        minLength={SEARCH_QUERY_MIN_LENGTH}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        required
        autoComplete="off"
        enterKeyHint="search"
        className={`w-full rounded-full border border-border bg-surface shadow-card outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-ring ${
          large ? "h-14 pr-32 pl-13 text-base" : "h-11 pr-24 pl-11 text-sm"
        }`}
      />
      {hidden.map(([name, value], i) => (
        <input key={`${name}-${i}`} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-accent font-medium text-accent-foreground transition-colors hover:bg-accent-strong ${
          large ? "right-2 h-10 px-6" : "right-1.5 h-8 px-4 text-sm"
        }`}
      >
        Search
      </button>
    </Form>
  );
}
