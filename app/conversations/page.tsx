"use client";
import { useEffect, useState } from "react";
import { SideNav } from "@/components/SideNav";

interface ConversationListItem {
  id: string;
  channel: "WHATSAPP" | "EMAIL" | "CALL";
  contactName: string;
  lastMessage: string | null;
  lastMessageAt: string;
  aiSummary: string | null;
  intent: string | null;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  recommendedNextAction: string | null;
  urgency: string | null;
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  aiGenerated: boolean;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  channel: string;
  contact: { name: string; phone: string | null };
  aiSummary: string | null;
  intent: string | null;
  sentiment: string | null;
  recommendedNextAction: string | null;
  urgency: string | null;
  messages: Message[];
}

const CHANNEL_ICON: Record<string, string> = { WHATSAPP: "💬", EMAIL: "✉️", CALL: "📞" };

export default function ConversationsPage() {
  const [list, setList] = useState<ConversationListItem[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  const [showCallForm, setShowCallForm] = useState(false);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [callForm, setCallForm] = useState({ contactId: "", direction: "OUTBOUND" as "INBOUND" | "OUTBOUND", durationSeconds: "", notes: "" });
  const [loggingCall, setLoggingCall] = useState(false);

  async function openCallForm() {
    setShowCallForm(true);
    if (contacts.length === 0) {
      const res = await fetch("/api/crm/contacts");
      if (res.ok) setContacts((await res.json()).contacts.map((c: any) => ({ id: c.id, name: c.name })));
    }
  }

  async function submitCallLog(e: React.FormEvent) {
    e.preventDefault();
    if (!callForm.contactId || !callForm.notes.trim()) return;
    setLoggingCall(true);
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: callForm.contactId,
        direction: callForm.direction,
        durationSeconds: callForm.durationSeconds ? Number(callForm.durationSeconds) : undefined,
        transcriptOrNotes: callForm.notes,
      }),
    });
    setLoggingCall(false);
    if (res.ok) {
      const data = await res.json();
      setCallForm({ contactId: "", direction: "OUTBOUND", durationSeconds: "", notes: "" });
      setShowCallForm(false);
      setFilter("CALL");
      setSelectedId(data.conversationId);
      loadList("CALL");
    }
  }

  async function loadList(channel?: string | null) {
    const res = await fetch(`/api/conversations${channel ? `?channel=${channel}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setList(data.conversations);
      if (!selectedId && data.conversations[0]) setSelectedId(data.conversations[0].id);
    }
  }

  async function loadDetail(id: string) {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) setDetail((await res.json()).conversation);
  }

  useEffect(() => {
    loadList(filter);
  }, [filter]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  async function generateDraft() {
    if (!selectedId) return;
    setDrafting(true);
    const res = await fetch(`/api/conversations/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ai_draft" }),
    });
    setDrafting(false);
    if (res.ok) setDraft((await res.json()).draft);
  }

  async function sendReply(aiGenerated: boolean) {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "send", body: draft, aiGenerated }),
    });
    setSending(false);
    if (res.ok) {
      setDraft("");
      loadDetail(selectedId);
      loadList(filter);
    }
  }

  const sentimentColor =
    detail?.sentiment === "NEGATIVE" ? "text-red-300 bg-red-950/40 border-red-900/40" : detail?.sentiment === "POSITIVE" ? "text-green-300 bg-green-950/40 border-green-900/40" : "text-neutral-300 bg-neutral-800 border-neutral-700";

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex flex-1">
        {/* List column */}
        <div className="w-80 shrink-0 border-r border-neutral-800">
          <div className="border-b border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-white">Conversations</h1>
                <p className="text-xs text-neutral-500">WhatsApp, email and calls — auto-summarized.</p>
              </div>
              <button onClick={openCallForm} className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-500">
                + Log call
              </button>
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              {[null, "WHATSAPP", "EMAIL", "CALL"].map((c) => (
                <button
                  key={c ?? "all"}
                  onClick={() => setFilter(c)}
                  className={"rounded-full px-3 py-1 " + (filter === c ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-300")}
                >
                  {c ?? "All"}
                </button>
              ))}
            </div>
          </div>

          {showCallForm && (
            <form onSubmit={submitCallLog} className="space-y-2 border-b border-neutral-800 bg-neutral-900 p-4">
              <select
                required
                value={callForm.contactId}
                onChange={(e) => setCallForm({ ...callForm, contactId: e.target.value })}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white"
              >
                <option value="">Select contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <select
                  value={callForm.direction}
                  onChange={(e) => setCallForm({ ...callForm, direction: e.target.value as "INBOUND" | "OUTBOUND" })}
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white"
                >
                  <option value="OUTBOUND">Outbound</option>
                  <option value="INBOUND">Inbound</option>
                </select>
                <input
                  placeholder="Duration (sec)"
                  type="number"
                  value={callForm.durationSeconds}
                  onChange={(e) => setCallForm({ ...callForm, durationSeconds: e.target.value })}
                  className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white"
                />
              </div>
              <textarea
                required
                placeholder="Call notes / transcript — AI will summarize this for intent & sentiment"
                rows={3}
                value={callForm.notes}
                onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={loggingCall} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-50">
                  {loggingCall ? "Saving + analyzing…" : "Save call log"}
                </button>
                <button type="button" onClick={() => setShowCallForm(false)} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300">
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="max-h-[calc(100vh-110px)] overflow-y-auto">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={"block w-full border-b border-neutral-900 px-4 py-3 text-left " + (selectedId === c.id ? "bg-neutral-900" : "hover:bg-neutral-900/50")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {CHANNEL_ICON[c.channel]} {c.contactName}
                  </span>
                  {c.intent === "High" && <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] text-amber-300">High intent</span>}
                </div>
                <p className="mt-1 truncate text-xs text-neutral-500">{c.aiSummary ?? c.lastMessage ?? "No messages yet"}</p>
              </button>
            ))}
            {list.length === 0 && <p className="p-4 text-sm text-neutral-500">No conversations yet — they appear here as WhatsApp messages come in.</p>}
          </div>
        </div>

        {/* Detail column */}
        <div className="flex-1 px-6 py-6">
          {!detail ? (
            <p className="text-sm text-neutral-500">Select a conversation.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{detail.contact.name}</h2>
                  <p className="text-xs text-neutral-500">{CHANNEL_ICON[detail.channel]} {detail.channel} · {detail.contact.phone ?? "no phone on file"}</p>
                </div>
              </div>

              {detail.aiSummary && (
                <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">AI Summary</p>
                  <p className="mt-1 text-sm text-neutral-200">{detail.aiSummary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-300">Intent: {detail.intent ?? "—"}</span>
                    <span className={`rounded-full border px-2 py-1 ${sentimentColor}`}>Sentiment: {detail.sentiment ?? "—"}</span>
                    {detail.urgency && <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-300">Urgency: {detail.urgency}</span>}
                  </div>
                  {detail.recommendedNextAction && (
                    <p className="mt-2 text-xs text-neutral-400">
                      <span className="font-medium text-neutral-300">Recommended next action: </span>
                      {detail.recommendedNextAction}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 max-h-[42vh] space-y-2 overflow-y-auto rounded-xl border border-neutral-800 p-4">
                {detail.messages.map((m) => (
                  <div key={m.id} className={m.direction === "OUTBOUND" ? "text-right" : ""}>
                    <span
                      className={
                        "inline-block max-w-[75%] rounded-2xl px-3 py-1.5 text-sm " +
                        (m.direction === "OUTBOUND" ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-100")
                      }
                    >
                      {m.body}
                      {m.aiGenerated && <span className="ml-1 text-[10px] opacity-60">· AI</span>}
                    </span>
                  </div>
                ))}
                {detail.messages.length === 0 && <p className="text-sm text-neutral-500">No messages in this conversation yet.</p>}
              </div>

              {detail.channel !== "CALL" && (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write a reply, or let AI draft one…"
                      rows={2}
                      className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={generateDraft} disabled={drafting} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 disabled:opacity-50">
                      {drafting ? "Drafting…" : "✨ Reply for me"}
                    </button>
                    <button onClick={() => sendReply(false)} disabled={sending || !draft.trim()} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-50">
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
