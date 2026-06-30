"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: "", industry: "", businessGoals: "", productSummary: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold text-white">Tell us about your business</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Your AI employee uses this as context for every conversation, recommendation, and follow-up.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Business name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} required />
        <Field label="Industry" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} required placeholder="e.g. D2C skincare, B2B SaaS, real estate" />
        <Field label="Business goals" value={form.businessGoals} onChange={(v) => setForm({ ...form, businessGoals: v })} textarea placeholder="What does this quarter look like?" />
        <Field label="What do you sell?" value={form.productSummary} onChange={(v) => setForm({ ...form, productSummary: v })} textarea />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={saving} className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving ? "Saving..." : "Finish setup"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, required, textarea, placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; textarea?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-neutral-300">{label}</span>
      {textarea ? (
        <textarea
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
