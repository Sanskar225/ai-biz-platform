"use client";
import { useEffect, useState } from "react";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

interface Task { id:string; title:string; notes:string|null; dueAt:string|null; completedAt:string|null; createdByAI:boolean; contact?:{name:string}|null; }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/tasks").then(r=>r.json()).then(d=>setTasks(d.tasks??[])).finally(()=>setLoading(false));
  }, []);

  async function addTask(e:React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    setSaving(true);
    const res = await apiFetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:newTask})});
    if (res.ok) { const d=await res.json(); setTasks(t=>[d.task,...t]); setNewTask(""); }
    setSaving(false);
  }

  async function complete(id:string) {
    await apiFetch(`/api/tasks/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({completedAt:new Date().toISOString()})});
    setTasks(t=>t.map(task=>task.id===id?{...task,completedAt:new Date().toISOString()}:task));
  }

  const pending = tasks.filter(t=>!t.completedAt);
  const done = tasks.filter(t=>t.completedAt);

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 overflow-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">Tasks</h1>
            <p className="text-xs text-neutral-400">{pending.length} pending · {done.length} completed</p>
          </div>
        </div>

        <form onSubmit={addTask} className="mb-6 flex gap-3">
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a task…"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white" />
          <button type="submit" disabled={saving||!newTask.trim()} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50">Add</button>
        </form>

        <div className="space-y-2">
          {loading ? Array.from({length:4}).map((_,i)=>(
            <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-900" />
          )) : pending.map(t=>(
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
              <button onClick={()=>complete(t.id)} className="h-5 w-5 shrink-0 rounded border border-neutral-600 hover:border-white hover:bg-white/10 transition-colors" />
              <div className="flex-1">
                <p className="text-sm text-white">{t.title}
                  {t.createdByAI && <span className="ml-2 rounded-full bg-purple-900/40 px-1.5 py-0.5 text-[9px] text-purple-300">✦ AI</span>}
                </p>
                {t.notes && <p className="text-xs text-neutral-500 mt-0.5">{t.notes}</p>}
              </div>
              {t.dueAt && (
                <span className={`text-xs ${new Date(t.dueAt)<new Date()?"text-red-400":"text-neutral-500"}`}>
                  {new Date(t.dueAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>

        {done.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-600 mb-2">Completed</p>
            <div className="space-y-1.5">
              {done.map(t=>(
                <div key={t.id} className="flex items-center gap-3 rounded-lg px-4 py-2 opacity-40">
                  <div className="h-5 w-5 shrink-0 rounded border border-neutral-600 bg-neutral-700 flex items-center justify-center">
                    <span className="text-[10px] text-white">✓</span>
                  </div>
                  <p className="text-sm text-neutral-500 line-through">{t.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
