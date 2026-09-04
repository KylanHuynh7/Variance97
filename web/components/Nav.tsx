"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/", label: "Home" },
  { href: "/three-acts", label: "Three Acts" },
  { href: "/peer-comparison", label: "Peer Comparison" },
  { href: "/feature-contributions", label: "Feature Contributions" },
  { href: "/limitations", label: "Limitations" },
  { href: "/pipeline-status", label: "Pipeline Status" },
];

export default function Nav() {
  const pathname = usePathname();
  const normalized =
    pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return (
    <nav>
      {PAGES.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={normalized === p.href ? "page" : undefined}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
