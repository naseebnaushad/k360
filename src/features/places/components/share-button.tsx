"use client";

import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const whatsAppUrl = (text: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;

/**
 * Shares the current page. Uses the phone's own share sheet (which includes
 * WhatsApp) when there is one; otherwise offers WhatsApp and "Copy link".
 */
export function ShareButton({
  title,
  text,
  className = "",
  compact = false,
}: {
  title: string;
  text: string;
  className?: string;
  /** Icon only, for tight spaces like the mobile action bar. */
  compact?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !menuRef.current?.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // Cancelled by the visitor: nothing to do.
      }
      return;
    }
    setMenuOpen((open) => !open);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const item =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-muted";

  return (
    <div ref={menuRef} className={`relative ${compact ? "" : "inline-flex"}`}>
      <button
        type="button"
        onClick={share}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={className}
      >
        <Share2 aria-hidden className="size-4" />
        {compact ? <span className="sr-only">Share</span> : "Share"}
      </button>
      {menuOpen && (
        <div
          role="menu"
          className={`absolute z-40 w-52 rounded-2xl border border-border bg-surface p-1.5 shadow-lift ${
            compact ? "right-0 bottom-full mb-2" : "top-full left-0 mt-2"
          }`}
        >
          <a
            role="menuitem"
            href={whatsAppUrl(text, typeof window === "undefined" ? "" : window.location.href)}
            target="_blank"
            rel="noopener noreferrer"
            className={item}
            onClick={() => setMenuOpen(false)}
          >
            <MessageCircle aria-hidden className="size-4 text-success" />
            WhatsApp
          </a>
          <button role="menuitem" type="button" onClick={copy} className={item}>
            {copied ? (
              <Check aria-hidden className="size-4 text-success" />
            ) : (
              <Link2 aria-hidden className="size-4 text-muted" />
            )}
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
