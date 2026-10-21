import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

interface SiteHeaderProps {
  /** Where the brand links to: "/" on the current host, or an absolute root URL. */
  homeHref: string;
  /** Shown next to the brand, e.g. the city name. */
  context?: ReactNode;
  children?: ReactNode;
  size?: "default" | "wide";
}

export function SiteHeader({ homeHref, context, children, size = "default" }: SiteHeaderProps) {
  const isExternal = homeHref.startsWith("http");
  const brand = (
    <>
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground"
      >
        {siteConfig.name.slice(0, 1)}
      </span>
      <span className="font-semibold tracking-tight">{siteConfig.name}</span>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <Container size={size} className="flex h-16 items-center gap-3">
        {isExternal ? (
          <a href={homeHref} className="flex items-center gap-2.5">
            {brand}
          </a>
        ) : (
          <Link href={homeHref} className="flex items-center gap-2.5">
            {brand}
          </Link>
        )}
        {context && (
          <>
            <span aria-hidden className="text-border-strong">
              /
            </span>
            {context}
          </>
        )}
        <nav className="ml-auto flex items-center gap-1 text-sm">{children}</nav>
      </Container>
    </header>
  );
}

export function HeaderLink({
  href,
  children,
  external = false,
  tone = "default",
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  /** "danger" for links that must stand out, like Emergency. */
  tone?: "default" | "danger";
}) {
  const className =
    tone === "danger"
      ? "rounded-full px-3 py-1.5 font-medium text-danger transition-colors hover:bg-danger/10"
      : "rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground";
  return external ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
