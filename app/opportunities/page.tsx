"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

const STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
type Stage = typeof STAGES[number];

const STAGE_META: Record<Stage, { label: string; color: string; dot: string }> = {
  NEW:         { label: "New Lead",    color: "border-neutral-600",  dot: "bg-neutral-400" },
  QUALIFIED:   { label: "Qualified",   color: "border-blue-700",     dot: "bg-blue-400" },
  PROPOSAL:    { label: "Proposal",    color: "border-purple-700",   dot: "bg-purple-400" },
  NEGOTIATION: { label: "Negotiation", color: "border-amber-700",    dot: "bg-amber-400" },
  WON:         { label: "Won",         color: "border-green-700",    dot: "bg-green-400" },
  LOST:        { label: "Lost",        color: "border-red-900",      dot: "bg-red-500" },
};

interface Opp {
  id: string;
  title: string;
  stage: Stage;
  value: string;
  aiScore: number | null;
  nextBestAction: string | null;
  contact: { name: string; email: string | null };
}

function scoreColor(s: number | null) {
  if (!s) return "text-neutral-500";
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-amber-400";
  return "text-red-400";
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-bold text-white">
      {initials}
    </div>
  );
}

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<Stage | null>(null);

  async function load() {
    const res = await apiFetch("/api/crm/opportunities");
    if (res.ok) setOpps((await res.json()).opportunities);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function moveCard(id: string, newStage: Stage) {
    setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, stage: newStage } : o)));
    await apiFetch(`/api/crm/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
  }

  const byStage = (stage: Stage) => opps.filter((o) => o.stage === stage);
  const totalValue = (stage: Stage) => byStage(stage).reduce((s, o) => s + Number(o.value), 0);

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Pipeline</h1>
            <p className="text-xs text-neutral-400">Drag cards to update stage · {opps.length} deals</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-neutral-500">Total Pipeline</p>
              <p className="text-sm font-semibold text-white">
                ₹{opps.filter(o => !["WON","LOST"].includes(o.stage)).reduce((s,o)=>s+Number(o.value),0).toLocaleString("en-IN")}
              </p>
            </div>
            <Link href="/agent" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-900">
              ✦ AI Qualify Leads
            </Link>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {STAGES.map((stage) => {
            const cards = byStage(stage);
            const meta = STAGE_META[stage];
            const isHovered = hoveredStage === stage;
            return (
              <div
                key={stage}
                className={`flex w-64 shrink-0 flex-col rounded-xl border ${meta.color} ${isHovered ? "bg-white/5" : "bg-neutral-900/40"} transition-colors`}
                onDragOver={(e) => { e.preventDefault(); setHoveredStage(stage); }}
                onDragLeave={() => setHoveredStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoveredStage(null);
                  if (draggingId) moveCard(draggingId, stage);
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="text-xs font-semibold text-neutral-300">{meta.label}</span>
                    <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">{cards.length}</span>
                  </div>
                  {totalValue(stage) > 0 && (
                    <span className="text-[10px] text-neutral-500">₹{Math.round(totalValue(stage)/1000)}K</span>
                  )}
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {loading ? (
                    <div className="h-20 animate-pulse rounded-lg bg-neutral-800" />
                  ) : cards.length === 0 ? (
                    <div className={`rounded-lg border border-dashed ${meta.color} px-3 py-4 text-center text-[10px] text-neutral-600`}>
                      Drop here
                    </div>
                  ) : (
                    cards.map((opp) => (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={() => setDraggingId(opp.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className={`cursor-grab rounded-lg border border-neutral-800 bg-neutral-900 p-3 transition-shadow ${draggingId === opp.id ? "opacity-40" : "hover:border-neutral-600 hover:shadow-md"}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Link href={`/opportunities/${opp.id}`} className="text-xs font-medium text-white hover:underline leading-tight">
                            {opp.title}
                          </Link>
                          {opp.aiScore && (
                            <span className={`shrink-0 text-xs font-bold ${scoreColor(opp.aiScore)}`}>{opp.aiScore}</span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={opp.contact.name} />
                            <span className="text-[11px] text-neutral-400">{opp.contact.name.split(" ")[0]}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-neutral-300">
                            ₹{Math.round(Number(opp.value) / 1000)}K
                          </span>
                        </div>
                        {opp.nextBestAction && (
                          <p className="mt-2 rounded bg-neutral-800 px-2 py-1 text-[10px] text-neutral-400 leading-snug">
                            ✦ {opp.nextBestAction}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
