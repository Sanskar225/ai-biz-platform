"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SideNav } from "@/components/SideNav";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
  tags: string[];
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
  const [saving, setSaving] = useState(false);

  async function load(q?: string) {
    const res = await fetch(`/api/crm/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.ok) setContacts((await res.json()).contacts);
  }

  useEffect(() => {
    load();
  }, []);

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        company: form.company || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ name: "", phone: "", email: "", company: "" });
      setShowForm(false);
      load(query);
    }
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 px-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Contacts</h1>
            <p className="text-sm text-neutral-400">Everyone your AI employee and team have talked to.</p>
          </div>
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900">
            {showForm ? "Cancel" : "+ Add contact"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createContact} className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white" />
            <input placeholder="Phone (+91...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white" />
            <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white" />
            <button disabled={saving} className="col-span-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50">
              {saving ? "Saving..." : "Save contact"}
            </button>
          </form>
        )}

        <input
          placeholder="Search by name, phone, or email…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            load(e.target.value);
          }}
          className="mt-4 w-full max-w-sm rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
        />

        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-neutral-800 text-neutral-200 hover:bg-neutral-900">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2 text-neutral-400">{c.company ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-400">{c.phone ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-400">{c.email ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-400">{c.source ?? "—"}</td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No contacts yet. Add one above, or run the lead workflow from the AI Employee.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Want pipeline view? Opportunities are linked from each contact via the AI agent (try “show me opportunities”) or visit{" "}
          <Link href="/dashboard" className="underline">
            the dashboard
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
