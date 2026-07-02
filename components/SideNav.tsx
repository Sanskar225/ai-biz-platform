"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { group: "MAIN", items: [
    { href: "/dashboard", icon: "⊞", label: "Dashboard" },
    { href: "/conversations", icon: "💬", label: "Inbox" },
  ]},
  { group: "CRM", items: [
    { href: "/contacts", icon: "👤", label: "Contacts" },
    { href: "/opportunities", icon: "◈", label: "Pipeline" },
    { href: "/tasks", icon: "✓", label: "Tasks" },
  ]},
  { group: "AI", items: [
    { href: "/agent", icon: "✦", label: "AI Employee" },
    { href: "/analytics", icon: "↗", label: "Analytics" },
  ]},
  { group: "WORKSPACE", items: [
    { href: "/settings", icon: "⚙", label: "Settings" },
  ]},
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex w-52 shrink-0 flex-col border-r border-neutral-800/60 bg-neutral-950 px-3 py-5">
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-black">AI</div>
          <span className="text-sm font-semibold text-white">BizOS</span>
        </div>
      </div>
      <div className="flex-1 space-y-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="mb-1 px-2 text-[10px] font-semibold tracking-widest text-neutral-600">{group.group}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      active
                        ? "bg-white/10 font-medium text-white"
                        : "text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="w-4 text-center text-base leading-none">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <p className="text-xs font-medium text-white">Free Plan</p>
        <p className="text-[10px] text-neutral-500">Upgrade for unlimited AI</p>
      </div>
    </nav>
  );
}
