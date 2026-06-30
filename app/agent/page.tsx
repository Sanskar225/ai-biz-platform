"use client";
import { useRef, useState } from "react";
import { SideNav } from "@/components/SideNav";

interface ToolCallEvent {
  name: string;
  args: Record<string, any>;
  result: any;
  reasoning: string;
}

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  toolCalls?: ToolCallEvent[];
}

export default function AgentPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!input.trim() || streaming) return;
    const userText = input;
    setInput("");
    setStreaming(true);
    setTurns((t) => [...t, { role: "user", text: userText }, { role: "assistant", text: "", toolCalls: [] }]);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message: userText }),
    });

    if (!res.body) {
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const ev of events) {
        if (!ev.startsWith("data: ")) continue;
        const payload = JSON.parse(ev.slice(6));

        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (payload.type === "token") {
            last.text += payload.text;
          } else if (payload.type === "tool_call") {
            last.toolCalls = [...(last.toolCalls ?? []), payload];
          } else if (payload.type === "done") {
            setSessionId(payload.sessionId);
          }
          return next;
        });
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    setStreaming(false);
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="mx-auto flex h-screen max-w-2xl flex-1 flex-col px-6 py-8">
      <h1 className="text-xl font-semibold text-white">AI Employee</h1>
      <p className="text-sm text-neutral-400">Try: &quot;Follow up with Rahul tomorrow&quot; or &quot;What&apos;s my pipeline looking like?&quot;</p>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "text-right" : ""}>
            <div
              className={
                "inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm " +
                (t.role === "user" ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-100")
              }
            >
              {t.text || (t.role === "assistant" ? "…" : "")}
            </div>
            {t.toolCalls?.map((tc, j) => (
              <div key={j} className="mt-2 rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-left text-xs">
                <p className="font-mono text-neutral-300">⚙ {tc.name}({JSON.stringify(tc.args)})</p>
                <p className="mt-1 text-neutral-500">Why: {tc.reasoning}</p>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask your AI employee anything…"
        />
        <button onClick={send} disabled={streaming} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50">
          Send
        </button>
      </div>
    </main>
    </div>
  );
}
