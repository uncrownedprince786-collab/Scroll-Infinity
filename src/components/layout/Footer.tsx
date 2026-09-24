import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { siteConfig } from "@/lib/config";

const EXPLORE = [
  { label: "Topics", href: "/topics" },
  { label: "Latest", href: "/latest" },
  { label: "Search", href: "/search" },
] as const;

const PROJECT = [
  { label: "About", href: "/about" },
  { label: "Methodology", href: "/methodology" },
] as const;

/** Quiet, editorial footer. Only links to routes that exist. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__inner">
          <div className="footer-brand">
            <Link
              href="/"
              className="brand-link"
              aria-label={`${siteConfig.name} — home`}
            >
              <Logo />
            </Link>
            <p className="footer-brand__tagline">{siteConfig.description}</p>
          </div>

          <div className="footer-cols">
            <nav className="footer-col" aria-label="Explore">
              <h2 className="footer-col__title">Explore</h2>
              <ul role="list" className="footer-col__list">
                {EXPLORE.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="footer-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="footer-col" aria-label="Project">
              <h2 className="footer-col__title">Project</h2>
              <ul role="list" className="footer-col__list">
                {PROJECT.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="footer-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="footer-col">
              <h2 className="footer-col__title">Sources</h2>
              <p className="footer-attribution">
                Data from Wikipedia (CC BY-SA) and Wikidata (CC0).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="footer-bottom">
          <span>
            © {year} {siteConfig.name} — {siteConfig.tagline}
          </span>
          <Logo variant="compact" markSize={20} />
        </div>
      </div>
    </footer>
  );
}
