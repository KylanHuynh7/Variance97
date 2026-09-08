"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/", label: "The claim" },
  { href: "/three-acts", label: "Three Acts" },
  { href: "/peer-comparison", label: "Peer test" },
  { href: "/feature-contributions", label: "The model" },
  { href: "/limitations", label: "Limitations" },
  { href: "/pipeline-status", label: "Pipeline" },
];

export default function Nav() {
  const pathname = usePathname();
  const current =
    pathname !== "/" && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return (
    <header className="masthead">
      <div className="masthead-inner">
        <Link href="/" className="wordmark">
          Variance<em>97</em>
        </Link>
        <nav aria-label="Sections">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={current === p.href ? "page" : undefined}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
