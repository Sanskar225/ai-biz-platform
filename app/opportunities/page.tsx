"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SideNav } from "@/components/SideNav";

interface Opportunity {
  id: string;
  title: string;
  stage: string;
  value: string;
  aiScore: number | null;
  contact: { name: string };
}

const STAGE_COLOR: Record<string, string> = {
  NEW: "bg-neutral-700",
  QUALIFIED: "bg-blue-700",
  PROPOSAL: "bg-amber-700",
  NEGOTIATION: "bg-orange-700",
  WON: "bg-green-700",
  LOST: "bg-red-900",
};

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    fetch("/api/crm/opportunities")
      .then((r) => r.json())
      .then((d) => setOpportunities(d.opportunities))
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 px-8 py-8">
        <h1 className="text-2xl font-semibold text-white">Opportunities</h1>
        <p className="text-sm text-neutral-400">Pipeline, AI-scored.</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">Opportunity</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Stage</th>
                <th className="px-4 py-2 font-medium">AI Score</th>
                <th className="px-4 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id} className="border-t border-neutral-800 text-neutral-200 hover:bg-neutral-900">
                  <td className="px-4 py-2">
                    <Link href={`/opportunities/${o.id}`} className="hover:underline">
                      {o.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{o.contact.name}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs text-white ${STAGE_COLOR[o.stage] ?? "bg-neutral-700"}`}>{o.stage}</span>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{o.aiScore ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-400">₹{Number(o.value).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {opportunities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No opportunities yet — run the lead workflow or ask the AI Employee to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
