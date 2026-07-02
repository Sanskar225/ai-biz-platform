"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

const revenueData = [
  { month: "Feb", value: 180000 },
  { month: "Mar", value: 220000 },
  { month: "Apr", value: 195000 },
  { month: "May", value: 310000 },
  { month: "Jun", value: 275000 },
  { month: "Jul", value: 420000 },
];

const funnelData = [
  { name: "Leads", value: 142, fill: "#3b82f6" },
  { name: "Qualified", value: 89, fill: "#8b5cf6" },
  { name: "Proposal", value: 43, fill: "#f59e0b" },
  { name: "Negotiation", value: 18, fill: "#f97316" },
  { name: "Won", value: 9, fill: "#22c55e" },
];

const recentActivity = [
  { icon: "💬", text: "Rahul Sharma replied on WhatsApp", time: "2m ago", tag: "Hot" },
  { icon: "✦", text: "AI qualified FastLogistics as high-intent lead (score 82)", time: "1h ago", tag: "AI" },
  { icon: "◈", text: "Acme Corp deal moved to Won — ₹1,50,000", time: "3h ago", tag: "Won" },
  { icon: "✓", text: "Task: Send proposal to StartupIO due tomorrow", time: "5h ago", tag: "Task" },
  { icon: "📞", text: "Call log with Arjun Kapoor added — AI summary ready", time: "Yesterday", tag: "Call" },
];

const TAG_COLORS: Record<string, string> = {
  Hot: "bg-red-900/40 text-red-300",
  AI: "bg-purple-900/40 text-purple-300",
  Won: "bg-green-900/40 text-green-300",
  Task: "bg-amber-900/40 text-amber-300",
  Call: "bg-blue-900/40 text-blue-300",
};

interface Metrics {
  activeOpportunities: number;
  revenuePipeline: number;
  pendingFollowups: number;
  newCustomersThisWeek: number;
  aiAlerts: { contact: string; summary: string | null }[];
}

const SUGGESTIONS = [
  "Which leads need attention today?",
  "Summarize yesterday's conversations",
  "Find revenue opportunities this week",
  "Follow up with all warm leads",
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/metrics")
      .then((r) => r.json())
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "Leads", value: metrics?.activeOpportunities ?? "—", sub: "+18% vs last month", color: "text-white" },
    { label: "High Intent", value: 8, sub: "Need follow-up", color: "text-amber-300" },
    { label: "Booked", value: 4, sub: "Meetings this week", color: "text-green-300" },
    { label: "Pipeline", value: metrics ? `₹${Math.round(metrics.revenuePipeline / 1000)}K` : "—", sub: "Active deals", color: "text-blue-300" },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-neutral-800/60 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                AI EMPLOYEE · ONLINE
              </div>
              <h1 className="mt-1 text-2xl font-semibold text-white">Good Morning 👋</h1>
              <p className="text-sm text-neutral-400">I reviewed yesterday's performance and the pipeline. Here's what matters today.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-right">
                  <p className="text-xs text-neutral-500">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{loading ? "—" : k.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Briefing */}
          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
              BRIEFING · Just now
            </div>
            <p className="mt-2 text-sm text-neutral-200">
              I identified <span className="font-semibold text-white">3 warm leads</span> not contacted in 72+ hours, worth{" "}
              <span className="font-semibold text-amber-300">₹4.1L</span> in pipeline value.
              Based on WhatsApp intent signals, I recommend a short personalised follow-up. I can draft and send all 3 in ~30 seconds.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/agent" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-900">
                ✦ Do it now
              </Link>
              <Link href="/opportunities" className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300">
                View pipeline →
              </Link>
            </div>
          </div>

          {/* Chat input */}
          <Link href="/agent" className="mt-3 flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-sm text-neutral-500 hover:border-neutral-600">
            Ask your AI employee anything…
            <span className="ml-auto text-xs">AI Employee · gpt-5 class ↑</span>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-0 divide-x divide-neutral-800/60">
          {/* Left: Revenue chart + Funnel */}
          <div className="col-span-2 p-6 space-y-6">
            {/* Revenue Area Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Revenue Pipeline</h2>
                <span className="text-xs text-neutral-500">Last 6 months</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}K`} />
                  <Tooltip
                    contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Pipeline"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#fff" strokeWidth={1.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Sales Funnel */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Sales Funnel</h2>
              <div className="space-y-1.5">
                {funnelData.map((f, i) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="w-20 text-right text-xs text-neutral-500">{f.name}</span>
                    <div className="flex-1 rounded-full bg-neutral-800 h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(f.value / 142) * 100}%`, background: f.fill }}
                      >
                        <span className="text-[10px] font-semibold text-white">{f.value}</span>
                      </div>
                    </div>
                    <span className="w-10 text-xs text-neutral-500">
                      {i === 0 ? "100%" : Math.round((f.value / 142) * 100) + "%"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Recent Activity</h2>
              <div className="space-y-2">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-neutral-800/60 bg-neutral-900/40 px-3 py-2.5">
                    <span className="text-base">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200 truncate">{a.text}</p>
                      <p className="text-xs text-neutral-500">{a.time}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_COLORS[a.tag]}`}>{a.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Suggestions + Alerts */}
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Suggested Focus</p>
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <Link key={s} href="/agent" className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-xs text-neutral-300 hover:border-neutral-600 hover:text-white">
                    {s} <span className="text-neutral-600">↗</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Key Insights</p>
              {metrics?.aiAlerts?.length ? (
                metrics.aiAlerts.map((a, i) => (
                  <div key={i} className="rounded-lg border border-red-900/30 bg-red-950/20 p-3 text-xs text-red-200 mb-2">
                    <p className="font-medium">{a.contact}</p>
                    <p className="mt-0.5 text-red-300/70">{a.summary}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-400">
                  Meta Ads are converting 3.2x better than Google search this week.
                  <Link href="/agent" className="mt-2 flex items-center gap-1 text-white">
                    Take action <span className="text-neutral-500">→</span>
                  </Link>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Tasks Due Today</p>
              <div className="space-y-2">
                {["Call Rahul Sharma", "Send proposal to StartupIO", "Review Acme Corp SOW"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-neutral-400">
                    <div className="h-4 w-4 rounded border border-neutral-600 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
