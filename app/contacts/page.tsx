"use client";
import { useEffect, useState, useCallback } from "react";
import { SideNav } from "@/components/SideNav";
import { apiFetch } from "@/lib/apiFetch";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
}

const EMPTY_FORM = { name: "", phone: "", email: "", company: "" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/crm/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await apiFetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone || undefined,
          email: form.email || undefined,
          company: form.company || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      load(query);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 px-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Contacts</h1>
            <p className="text-sm text-neutral-400">Everyone in your CRM.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm((s) => !s); setFormError(null); }}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
          >
            {showForm ? "Cancel" : "+ Add contact"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createContact} className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <input
              required
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white"
            />
            <input
              placeholder="Phone (+91…)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white"
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white"
            />
            <input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white"
            />
            {formError && <p className="col-span-2 text-xs text-red-400">{formError}</p>}
            <button
              type="submit"
              disabled={saving}
              className="col-span-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save contact"}
            </button>
          </form>
        )}

        <input
          placeholder="Search by name, phone, or email…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); load(e.target.value); }}
          className="mt-4 w-full max-w-sm rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white"
        />

        {error && <p className="mt-3 text-sm text-red-400">Error loading contacts: {error}</p>}

        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-neutral-800">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-24 animate-pulse rounded bg-neutral-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-500">
                    {query ? "No contacts matched your search." : "No contacts yet — add one above or ask the AI Employee to create one."}
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-800 text-neutral-200 hover:bg-neutral-900/60">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-neutral-400">{c.company ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-400">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-400">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-400">{c.source ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
