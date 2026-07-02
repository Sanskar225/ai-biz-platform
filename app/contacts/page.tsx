"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
  tags: string[];
  createdAt: string;
}

const COLORS = ["bg-blue-600","bg-purple-600","bg-green-600","bg-amber-600","bg-red-600","bg-pink-600","bg-teal-600"];
function avatarColor(name: string) { return COLORS[name.charCodeAt(0) % COLORS.length]; }
function initials(name: string) { return name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(); }

const EMPTY = { name:"", phone:"", email:"", company:"", source:"" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"card"|"table">("card");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string|null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const res = await apiFetch(`/api/crm/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.ok) setContacts((await res.json()).contacts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setFormError(null);
    const res = await apiFetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), phone: form.phone||undefined, email: form.email||undefined, company: form.company||undefined, source: form.source||undefined }),
    });
    if (res.ok) { setForm(EMPTY); setShowForm(false); load(query); }
    else { const d = await res.json().catch(()=>({})); setFormError(d.error ?? "Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Contacts</h1>
            <p className="text-xs text-neutral-400">{contacts.length} people in your CRM</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-neutral-700 overflow-hidden text-xs">
              {(["card","table"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 ${view===v?"bg-white text-neutral-900":"text-neutral-400 hover:text-white"}`}>
                  {v === "card" ? "⊞ Cards" : "☰ Table"}
                </button>
              ))}
            </div>
            <button onClick={() => { setShowForm(s=>!s); setFormError(null); }}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-200">
              {showForm ? "Cancel" : "+ Add Contact"}
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* Add Contact Form */}
          {showForm && (
            <form onSubmit={createContact} className="mb-5 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="mb-3 text-sm font-medium text-white">New Contact</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key:"name", placeholder:"Name *", required:true },
                  { key:"phone", placeholder:"Phone (+91…)" },
                  { key:"email", placeholder:"Email", type:"email" },
                  { key:"company", placeholder:"Company" },
                  { key:"source", placeholder:"Source (e.g. Meta Ads, Referral)" },
                ].map(({key, placeholder, required, type}) => (
                  <input key={key} required={required} type={type} placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({...form, [key]: e.target.value})}
                    className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white" />
                ))}
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50">
                  {saving ? "Saving…" : "Save Contact"}
                </button>
              </div>
              {formError && <p className="mt-2 text-xs text-red-400">{formError}</p>}
            </form>
          )}

          {/* Search */}
          <div className="mb-4 flex items-center gap-3">
            <input placeholder="🔍  Search contacts…" value={query}
              onChange={(e) => { setQuery(e.target.value); load(e.target.value); }}
              className="w-64 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white" />
          </div>

          {/* Card View */}
          {view === "card" && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {loading ? Array.from({length:6}).map((_,i)=>(
                <div key={i} className="h-40 animate-pulse rounded-xl bg-neutral-900 border border-neutral-800" />
              )) : contacts.length === 0 ? (
                <div className="col-span-4 py-12 text-center text-sm text-neutral-500">
                  {query ? "No contacts found." : "No contacts yet — add one above or run the lead workflow."}
                </div>
              ) : contacts.map((c) => (
                <div key={c.id} className="group rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${avatarColor(c.name)} text-sm font-bold text-white`}>
                      {initials(c.name)}
                    </div>
                    {c.tags?.length > 0 && (
                      <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">{c.tags[0]}</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="font-medium text-white text-sm">{c.name}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{c.company ?? "—"}</p>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-neutral-500">
                    {c.phone && <p>📞 {c.phone}</p>}
                    {c.email && <p>✉ {c.email}</p>}
                    {c.source && <p>🔗 {c.source}</p>}
                  </div>
                  <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href="/conversations" className="flex-1 rounded-lg border border-neutral-700 py-1 text-center text-[10px] text-neutral-300 hover:border-white hover:text-white">
                      💬 Chat
                    </Link>
                    <Link href="/agent" className="flex-1 rounded-lg border border-neutral-700 py-1 text-center text-[10px] text-neutral-300 hover:border-white hover:text-white">
                      ✦ AI
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table View */}
          {view === "table" && (
            <div className="overflow-hidden rounded-xl border border-neutral-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-900 text-[11px] uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({length:4}).map((_,i)=>(
                    <tr key={i} className="border-t border-neutral-800">
                      {Array.from({length:6}).map((_,j)=>(
                        <td key={j} className="px-4 py-3"><div className="h-3 w-20 animate-pulse rounded bg-neutral-800" /></td>
                      ))}
                    </tr>
                  )) : contacts.map((c) => (
                    <tr key={c.id} className="border-t border-neutral-800 hover:bg-neutral-900/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${avatarColor(c.name)} text-[10px] font-bold text-white`}>
                            {initials(c.name)}
                          </div>
                          <span className="font-medium text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">{c.company ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-400">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-400">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-400">{c.source ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.tags?.map((t)=>(
                            <span key={t} className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">{t}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
