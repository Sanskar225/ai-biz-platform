"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/conversations", label: "Conversations" },
  { href: "/contacts", label: "Contacts" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/agent", label: "AI Employee" },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="w-48 shrink-0 border-r border-neutral-800 px-3 py-6">
      <div className="space-y-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              "block rounded-lg px-3 py-2 text-sm " +
              (pathname?.startsWith(l.href) ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-900")
            }
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
