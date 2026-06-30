"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SideNav } from "@/components/SideNav";

const STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

interface OpportunityDetail {
  id: string;
  title: string;
  stage: string;
  value: string;
  aiScore: number | null;
  nextBestAction: string | null;
  nextBestActionReason: string | null;
  contact: { name: string; phone: string | null; email: string | null };
  tasks: { id: string; title: string; notes: string | null; dueAt: string | null; completedAt: string | null; createdByAI: boolean }[];
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  metadata: any;
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/crm/opportunities/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOpportunity(data.opportunity);
      setAuditTrail(data.auditTrail);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function updateStage(stage: string) {
    setSaving(true);
    await fetch(`/api/crm/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    setSaving(false);
    load();
  }

  if (!opportunity) {
    return (
      <div className="flex min-h-screen bg-neutral-950">
        <SideNav />
        <main className="flex-1 px-8 py-8 text-neutral-500">Loading…</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 px-8 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{opportunity.title}</h1>
            <p className="text-sm text-neutral-400">
              {opportunity.contact.name} · {opportunity.contact.phone ?? opportunity.contact.email ?? "no contact info"}
            </p>
          </div>
          <p className="text-xl font-semibold text-white">₹{Number(opportunity.value).toLocaleString("en-IN")}</p>
        </div>

        {/* Stage pipeline */}
        <div className="mt-6 flex gap-2">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => updateStage(s)}
              disabled={saving}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium " +
                (opportunity.stage === s ? "bg-white text-neutral-900" : "border border-neutral-700 text-neutral-400 hover:border-neutral-500")
              }
            >
              {s}
            </button>
          ))}
        </div>

        {/* AI score + next best action */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">AI Qualification Score</p>
            <p className="mt-1 text-3xl font-semibold text-white">{opportunity.aiScore ?? "—"}<span className="text-base text-neutral-500">/100</span></p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">AI Next Best Action</p>
            <p className="mt-1 text-sm text-white">{opportunity.nextBestAction ?? "No recommendation yet — ask the AI Employee about this contact."}</p>
            {opportunity.nextBestActionReason && <p className="mt-1 text-xs text-neutral-500">Why: {opportunity.nextBestActionReason}</p>}
          </div>
        </div>

        {/* Tasks */}
        <div className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">Tasks & Follow-ups</h2>
          <div className="mt-2 space-y-2">
            {opportunity.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm">
                <div>
                  <p className="text-white">
                    {t.title} {t.createdByAI && <span className="ml-1 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">AI</span>}
                  </p>
                  {t.notes && <p className="text-xs text-neutral-500">{t.notes}</p>}
                </div>
                <span className="text-xs text-neutral-500">{t.dueAt ? new Date(t.dueAt).toLocaleString() : "no due date"}</span>
              </div>
            ))}
            {opportunity.tasks.length === 0 && <p className="text-sm text-neutral-500">No tasks yet.</p>}
          </div>
        </div>

        {/* Audit trail */}
        <div className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">Audit Trail</h2>
          <div className="mt-2 space-y-1">
            {auditTrail.map((a) => (
              <div key={a.id} className="flex justify-between text-xs text-neutral-500">
                <span className="font-mono">{a.action}</span>
                <span>{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {auditTrail.length === 0 && <p className="text-sm text-neutral-500">No recorded actions yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
