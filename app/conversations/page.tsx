"use client";
import { useEffect, useRef, useState } from "react";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

interface ConvItem {
  id: string; channel: string; contactName: string; lastMessage: string|null;
  lastMessageAt: string; aiSummary: string|null; intent: string|null;
  sentiment: "POSITIVE"|"NEUTRAL"|"NEGATIVE"|null; recommendedNextAction: string|null; urgency: string|null;
}
interface Message { id:string; direction:"INBOUND"|"OUTBOUND"; body:string; aiGenerated:boolean; createdAt:string; }
interface Detail {
  id:string; channel:string; contact:{name:string;phone:string|null;email:string|null};
  aiSummary:string|null; intent:string|null; sentiment:string|null;
  recommendedNextAction:string|null; urgency:string|null; messages:Message[];
}

const ICON: Record<string,string> = { WHATSAPP:"💬", EMAIL:"✉️", CALL:"📞" };
const COLORS: Record<string,string> = ["bg-blue-600","bg-purple-600","bg-green-600","bg-amber-600","bg-red-600","bg-pink-600","bg-teal-600"].reduce((acc,c,i)=>({...acc,[i]:c}),{});
function avatarBg(name:string) { return Object.values(COLORS)[name.charCodeAt(0)%7]; }
function initials(name:string) { return name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(); }

const SENTIMENT_STYLE: Record<string,string> = {
  POSITIVE: "bg-green-900/40 text-green-300 border-green-800",
  NEUTRAL:  "bg-neutral-800 text-neutral-300 border-neutral-700",
  NEGATIVE: "bg-red-900/40 text-red-300 border-red-800",
};

export default function ConversationsPage() {
  const [list, setList] = useState<ConvItem[]>([]);
  const [filter, setFilter] = useState<string|null>(null);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [detail, setDetail] = useState<Detail|null>(null);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [contacts, setContacts] = useState<{id:string;name:string}[]>([]);
  const [callForm, setCallForm] = useState({contactId:"",direction:"OUTBOUND" as "INBOUND"|"OUTBOUND",durationSeconds:"",notes:""});
  const [loggingCall, setLoggingCall] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadList(ch?: string|null) {
    const res = await apiFetch(`/api/conversations${ch ? `?channel=${ch}` : ""}`);
    if (res.ok) {
      const d = await res.json();
      setList(d.conversations ?? []);
      if (!selectedId && d.conversations?.[0]) setSelectedId(d.conversations[0].id);
    }
  }
  async function loadDetail(id:string) {
    const res = await apiFetch(`/api/conversations/${id}`);
    if (res.ok) { setDetail((await res.json()).conversation); setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100); }
  }
  useEffect(() => { loadList(filter); }, [filter]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId]);

  async function generateDraft() {
    if (!selectedId) return;
    setDrafting(true);
    const res = await apiFetch(`/api/conversations/${selectedId}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:"ai_draft"}),
    });
    setDrafting(false);
    if (res.ok) setDraft((await res.json()).draft);
  }

  async function sendReply() {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    const res = await apiFetch(`/api/conversations/${selectedId}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:"send",body:draft}),
    });
    setSending(false);
    if (res.ok) { setDraft(""); loadDetail(selectedId!); loadList(filter); }
  }

  async function openCallForm() {
    setShowCallForm(true);
    if (!contacts.length) {
      const r = await apiFetch("/api/crm/contacts");
      if (r.ok) setContacts((await r.json()).contacts.map((c:any)=>({id:c.id,name:c.name})));
    }
  }

  async function submitCall(e:React.FormEvent) {
    e.preventDefault();
    setLoggingCall(true);
    const res = await apiFetch("/api/calls",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contactId:callForm.contactId,direction:callForm.direction,
        durationSeconds:callForm.durationSeconds?Number(callForm.durationSeconds):undefined,
        transcriptOrNotes:callForm.notes}),
    });
    setLoggingCall(false);
    if (res.ok) {
      const d = await res.json();
      setCallForm({contactId:"",direction:"OUTBOUND",durationSeconds:"",notes:""});
      setShowCallForm(false);
      setFilter("CALL");
      setSelectedId(d.conversationId);
      loadList("CALL");
    }
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex flex-1 overflow-hidden">

        {/* Conversation list — WhatsApp left panel */}
        <div className="flex w-72 shrink-0 flex-col border-r border-neutral-800/60">
          {/* Search + filter header */}
          <div className="border-b border-neutral-800/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Inbox</h2>
              <div className="flex gap-2">
                <button onClick={openCallForm} className="rounded-lg border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:text-white">+ Log call</button>
              </div>
            </div>
            <input placeholder="🔍  Search…" className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none" />
            <div className="flex gap-1.5 flex-wrap">
              {[null,"WHATSAPP","EMAIL","CALL"].map((c)=>(
                <button key={c??"all"} onClick={()=>setFilter(c)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${filter===c?"bg-white text-neutral-900":"border border-neutral-700 text-neutral-400 hover:text-white"}`}>
                  {c ? ICON[c]+" "+c.slice(0,1)+c.slice(1).toLowerCase() : "All"}
                </button>
              ))}
            </div>
          </div>

          {/* Log Call form */}
          {showCallForm && (
            <form onSubmit={submitCall} className="border-b border-neutral-800 bg-neutral-900 p-3 space-y-2">
              <p className="text-xs font-medium text-white">Log a call</p>
              <select required value={callForm.contactId} onChange={e=>setCallForm({...callForm,contactId:e.target.value})}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white">
                <option value="">Select contact…</option>
                {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={callForm.direction} onChange={e=>setCallForm({...callForm,direction:e.target.value as any})}
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white">
                  <option value="OUTBOUND">Outbound</option>
                  <option value="INBOUND">Inbound</option>
                </select>
                <input placeholder="Duration (sec)" type="number" value={callForm.durationSeconds}
                  onChange={e=>setCallForm({...callForm,durationSeconds:e.target.value})}
                  className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white" />
              </div>
              <textarea required placeholder="Notes / transcript…" rows={3} value={callForm.notes}
                onChange={e=>setCallForm({...callForm,notes:e.target.value})}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white" />
              <div className="flex gap-2">
                <button type="submit" disabled={loggingCall} className="flex-1 rounded-lg bg-white py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-50">
                  {loggingCall?"Saving + AI…":"Save call"}
                </button>
                <button type="button" onClick={()=>setShowCallForm(false)} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400">Cancel</button>
              </div>
            </form>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {list.length === 0 && (
              <p className="p-4 text-xs text-neutral-500">No conversations yet — they appear here as messages come in.</p>
            )}
            {list.map((c) => (
              <button key={c.id} onClick={()=>setSelectedId(c.id)}
                className={`flex w-full items-start gap-3 border-b border-neutral-800/50 px-3 py-3 text-left transition-colors ${selectedId===c.id?"bg-white/5":"hover:bg-white/[0.02]"}`}>
                <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${avatarBg(c.contactName)} text-xs font-bold text-white`}>
                  {initials(c.contactName)}
                  <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">{ICON[c.channel]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">{c.contactName}</span>
                    {c.intent === "High" && <span className="ml-1 shrink-0 rounded-full bg-amber-900/40 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">HOT</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500 truncate">{c.aiSummary ?? c.lastMessage ?? "No messages"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat detail — WhatsApp right panel */}
        {!detail ? (
          <div className="flex flex-1 items-center justify-center text-neutral-600 text-sm">
            Select a conversation
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-neutral-800/60 px-4 py-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${avatarBg(detail.contact.name)} text-xs font-bold text-white`}>
                {initials(detail.contact.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{detail.contact.name}</p>
                <p className="text-[10px] text-neutral-500">{ICON[detail.channel]} {detail.channel} · {detail.contact.phone ?? detail.contact.email ?? "—"}</p>
              </div>

              <div className="ml-auto flex items-center gap-3">
                {detail.urgency && <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400">⏰ {detail.urgency}</span>}
                <button onClick={generateDraft} disabled={drafting || detail.channel==="CALL"}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-white hover:border-neutral-500 disabled:opacity-40">
                  {drafting ? "Drafting…" : "✨ Reply for me"}
                </button>
              </div>
            </div>

            {/* AI Summary bar */}
            {detail.aiSummary && (
              <div className="border-b border-neutral-800/60 bg-neutral-900/50 px-4 py-2.5">
                <p className="text-xs font-medium text-neutral-400 mb-1">✦ AI Summary</p>
                <p className="text-xs text-neutral-200">{detail.aiSummary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.intent && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${detail.intent==="High"?"border-green-800 text-green-300":"border-neutral-700 text-neutral-400"}`}>Intent: {detail.intent}</span>}
                  {detail.sentiment && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${SENTIMENT_STYLE[detail.sentiment]}`}>Sentiment: {detail.sentiment}</span>}
                  {detail.urgency && <span className="rounded-full border border-amber-800 px-2 py-0.5 text-[10px] text-amber-300">Urgency: {detail.urgency}</span>}
                </div>
                {detail.recommendedNextAction && (
                  <p className="mt-1.5 text-[11px] text-neutral-400">💡 {detail.recommendedNextAction}</p>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {detail.messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction==="OUTBOUND"?"justify-end":"justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.direction==="OUTBOUND" ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-100"
                  }`}>
                    <p className="leading-relaxed">{m.body}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.direction==="OUTBOUND"?"text-neutral-500":"text-neutral-500"}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                      {m.aiGenerated && <span className="rounded bg-neutral-200/20 px-1">AI</span>}
                      {m.direction==="OUTBOUND" && <span className="text-blue-400">✓✓</span>}
                    </div>
                  </div>
                </div>
              ))}
              {detail.messages.length===0 && <p className="text-center text-sm text-neutral-600 py-8">No messages yet.</p>}
              <div ref={bottomRef} />
            </div>

            {/* Message input — WhatsApp-style bottom bar */}
            {detail.channel !== "CALL" ? (
              <div className="border-t border-neutral-800/60 px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={e=>setDraft(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendReply(); }}}
                    placeholder="Type a message…"
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                  />
                  <div className="flex flex-col gap-2">
                    <button onClick={()=>sendReply()} disabled={sending||!draft.trim()}
                      className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 disabled:opacity-40">
                      {sending?"…":"Send"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-neutral-800/60 px-4 py-3 text-center text-xs text-neutral-600">
                Call logs are read-only. Log a new call using "+ Log call" above.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
