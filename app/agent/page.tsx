"use client";
import { useRef, useState } from "react";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

interface ToolCall { name: string; args: any; result: any; reasoning: string; }
interface Turn { role: "user"|"assistant"; text: string; toolCalls?: ToolCall[]; }

const QUICK_ACTIONS = [
  { icon: "📤", label: "Send WhatsApp campaign", prompt: "Draft a WhatsApp follow-up for all warm leads from this week" },
  { icon: "📅", label: "Book appointments", prompt: "Which contacts should I schedule a meeting with this week?" },
  { icon: "📞", label: "Call warm prospects", prompt: "List the top 3 high-intent contacts I should call today" },
  { icon: "👥", label: "Assign leads to team", prompt: "Show me unassigned high-score leads" },
  { icon: "✓", label: "Create tasks", prompt: "Create follow-up tasks for all opportunities in Proposal stage" },
  { icon: "🔄", label: "Win-back ghosted", prompt: "Which customers have gone silent in the last 30 days?" },
];

const SUGGESTIONS = [
  "Follow up with Rahul Sharma tomorrow",
  "What's my pipeline looking like?",
  "Send a proposal to FastLogistics",
  "Which leads need attention today?",
];

export default function AgentPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string|undefined>();
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(message?: string) {
    const text = (message ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    setStreaming(true);
    setError(null);
    setTurns((t) => [...t, { role:"user", text }, { role:"assistant", text:"", toolCalls:[] }]);

    let res: Response;
    try {
      res = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
    } catch (e) {
      setError("Cannot reach server — is the dev server running?");
      setStreaming(false); return;
    }

    if (!res.ok) {
      const d = await res.json().catch(()=>({}));
      setError(d.error ?? `Server error ${res.status}`);
      setStreaming(false); return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream:true });
        const evs = buf.split("\n\n"); buf = evs.pop() ?? "";
        for (const ev of evs) {
          if (!ev.startsWith("data: ")) continue;
          const p = JSON.parse(ev.slice(6));
          if (p.type === "error") { setError(p.message); continue; }
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length-1];
            if (p.type === "token") last.text += p.text;
            else if (p.type === "tool_call") last.toolCalls = [...(last.toolCalls??[]), p];
            else if (p.type === "done") setSessionId(p.sessionId);
            return next;
          });
          bottomRef.current?.scrollIntoView({ behavior:"smooth" });
        }
      }
    } catch { setError("Stream interrupted."); }
    setStreaming(false);
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Chat */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> AI Employee · Online
              </div>
              <h1 className="text-lg font-semibold text-white">AI Employee</h1>
            </div>
            <button onClick={() => { setTurns([]); setSessionId(undefined); }}
              className="text-xs text-neutral-500 hover:text-white">New chat</button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {turns.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-2xl mb-3">✦</div>
                <p className="text-neutral-300 font-medium">What would you like me to do?</p>
                <p className="text-neutral-500 text-sm mt-1">I can search contacts, send WhatsApp messages, update deals, create tasks, and more.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 max-w-sm mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-left text-xs text-neutral-300 hover:border-neutral-600 hover:text-white">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[80%]">
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                    t.role === "user"
                      ? "bg-white text-neutral-900"
                      : "bg-neutral-800 text-neutral-100"
                  }`}>
                    {t.text || (t.role === "assistant" && streaming ? (
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:300ms]" />
                      </span>
                    ) : "")}
                  </div>
                  {t.toolCalls?.map((tc, j) => (
                    <div key={j} className="mt-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                      <p className="text-xs font-mono text-neutral-300">⚙ {tc.name}</p>
                      <p className="mt-1 text-[10px] text-neutral-500">Why: {tc.reasoning}</p>
                      {tc.result && (
                        <pre className="mt-1.5 max-h-20 overflow-hidden rounded bg-neutral-950 p-2 text-[10px] text-neutral-400">
                          {JSON.stringify(tc.result, null, 2).slice(0, 300)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-neutral-800/60 px-4 py-3">
            {error && <p className="mb-2 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>}
            <div className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 focus-within:border-neutral-500">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask your AI employee anything…"
                className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
              <button onClick={() => send()} disabled={streaming || !input.trim()}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-40">
                {streaming ? "…" : "Send"}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-neutral-600">
              AI Employee · Actions are recommendations, not promises.
            </p>
          </div>
        </div>

        {/* Right: Quick Actions panel */}
        <div className="w-64 shrink-0 border-l border-neutral-800/60 overflow-y-auto">
          <div className="border-b border-neutral-800/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Templates</p>
          </div>
          <div className="p-3 space-y-2">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.label} onClick={() => send(a.prompt)}
                className="flex w-full items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-left hover:border-neutral-600 hover:bg-neutral-800 transition-colors">
                <span className="text-lg">{a.icon}</span>
                <div>
                  <p className="text-xs font-medium text-neutral-200">{a.label}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">{a.prompt.slice(0, 50)}…</p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-neutral-800/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Recent Actions</p>
            {["Sent WhatsApp to Rahul", "Created task: Follow up Priya", "Updated deal to Negotiation"].map((a) => (
              <div key={a} className="flex items-center gap-2 py-1.5 text-[11px] text-neutral-500">
                <span className="h-1 w-1 rounded-full bg-neutral-700 shrink-0" />{a}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
