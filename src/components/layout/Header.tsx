"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { SearchField } from "@/components/ui/SearchField";
import { SearchIcon, MenuIcon, CloseIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import { siteConfig } from "@/lib/config";

const NAV = [
  { label: "Topics", href: "/topics" },
  { label: "Latest", href: "/latest" },
  { label: "Search", href: "/search" },
] as const;

const PANEL_ID = "mobile-nav-panel";

/**
 * Sticky, calm header. Server-safe presentational parts (logo, nav, search)
 * live here; the only client behaviour is the mobile menu toggle and a subtle
 * scroll-aware bottom border. Keyboard-accessible: aria-expanded on the toggle,
 * Esc closes and restores focus, the menu closes on navigation.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While open: Esc closes (and returns focus), move focus into the panel.
  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    !!pathname && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className={cx("site-header", scrolled && "site-header--scrolled")}>
      <div className="container site-header__inner">
        <Link
          href="/"
          className="brand-link"
          aria-label={`${siteConfig.name} — home`}
        >
          <Logo />
        </Link>

        <div className="header-spacer" />

        <nav className="site-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="site-nav__link"
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-search">
          <SearchField size="sm" label="Search Scroll Infinity" placeholder="Search…" />
        </div>

        <div className="header-actions">
          <Link
            href="/search"
            className="icon-button icon-button--search"
            aria-label="Search"
          >
            <SearchIcon />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="icon-button menu-button"
            aria-expanded={open}
            aria-controls={PANEL_ID}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <div id={PANEL_ID} className="mobile-panel">
          <div className="container mobile-panel__inner">
            <div className="mobile-panel__search">
              <SearchField label="Search Scroll Infinity" placeholder="Search…" />
            </div>
            <nav aria-label="Mobile">
              {NAV.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={i === 0 ? firstLinkRef : undefined}
                  className="mobile-panel__link"
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
