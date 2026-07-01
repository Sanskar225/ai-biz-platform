"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

interface Metrics {
  activeOpportunities: number;
  revenuePipeline: number;
  pendingFollowups: number;
  newCustomersThisWeek: number;
  aiAlerts: { contact: string; summary: string | null }[];
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/metrics")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(setMetrics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 px-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Good morning 👋</h1>
            <p className="text-sm text-neutral-400">Here's what's happening in your business today.</p>
          </div>
          <Link href="/agent" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200">
            Talk to AI Employee →
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            ⚠ Dashboard error: {error}. Check that DATABASE_URL is set and migrations have run.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900" />
            ))
          ) : (
            <>
              <KpiCard label="Active Opportunities" value={metrics?.activeOpportunities ?? 0} hint="Open pipeline" />
              <KpiCard label="Revenue Pipeline" value={metrics ? `₹${(metrics.revenuePipeline).toLocaleString("en-IN")}` : "₹0"} hint="Weighted value" />
              <KpiCard label="Pending Follow-ups" value={metrics?.pendingFollowups ?? 0} hint="Overdue tasks" />
              <KpiCard label="New Customers (7d)" value={metrics?.newCustomersThisWeek ?? 0} hint="This week" />
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">Quick actions</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: "Which leads need attention?", href: "/agent" },
              { label: "Summarize today's conversations", href: "/conversations" },
              { label: "View pipeline", href: "/opportunities" },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800"
              >
                {a.label} →
              </Link>
            ))}
          </div>
        </div>

        {/* AI Alerts */}
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
              !loading && <p className="text-sm text-neutral-500">No negative-sentiment conversations right now. 🎉</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
