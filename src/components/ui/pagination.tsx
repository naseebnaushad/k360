import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  page: number;
  pageCount: number;
  /** Builds the link for a given page number. */
  hrefForPage: (page: number) => string;
}

export function Pagination({ page, pageCount, hrefForPage }: PaginationProps) {
  if (pageCount <= 1) return null;

  const linkClass =
    "inline-flex h-10 items-center gap-1 rounded-full border border-border bg-surface px-4 text-sm font-medium shadow-card transition-colors hover:border-accent hover:text-accent";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={linkClass} rel="prev">
          <ChevronLeft aria-hidden className="size-4" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted tabular-nums">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={hrefForPage(page + 1)} className={linkClass} rel="next">
          Next <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
