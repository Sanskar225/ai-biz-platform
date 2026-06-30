"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { SideNav } from "@/components/SideNav";

interface Metrics {
  activeOpportunities: number;
  revenuePipeline: number;
  pendingFollowups: number;
  newCustomersThisWeek: number;
  aiAlerts: { contact: string; summary: string | null }[];
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/metrics")
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="mx-auto max-w-5xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Business Dashboard</h1>
        <Link href="/agent" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900">
          Talk to AI Employee
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Active Opportunities" value={metrics?.activeOpportunities ?? "—"} />
        <KpiCard label="Revenue Pipeline" value={metrics ? `₹${metrics.revenuePipeline.toLocaleString("en-IN")}` : "—"} />
        <KpiCard label="Pending Follow-ups" value={metrics?.pendingFollowups ?? "—"} />
        <KpiCard label="New Customers (7d)" value={metrics?.newCustomersThisWeek ?? "—"} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">AI Alerts</h2>
        <div className="mt-3 space-y-2">
          {metrics?.aiAlerts?.length ? (
            metrics.aiAlerts.map((a, i) => (
              <div key={i} className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-200">
                <span className="font-medium">{a.contact}:</span> {a.summary}
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500">No negative-sentiment conversations right now.</p>
          )}
        </div>
      </div>
    </main>
    </div>
  );
}
