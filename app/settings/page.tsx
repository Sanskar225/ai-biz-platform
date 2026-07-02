"use client";
import { SideNav } from "@/components/SideNav";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 px-8 py-8 max-w-3xl">
        <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>
        <div className="space-y-4">
          {[
            {title:"Business Profile",desc:"Business name, industry, timezone"},
            {title:"WhatsApp Integration",desc:"Connect Meta Cloud API · Status: Sandbox"},
            {title:"Email Integration",desc:"Connect Resend for inbound/outbound email"},
            {title:"AI Configuration",desc:"Gemini model, response style, tool permissions"},
            {title:"Team Members",desc:"Invite and manage team access"},
            {title:"Notifications",desc:"Alert preferences and digest emails"},
            {title:"API Keys",desc:"Access tokens for external integrations"},
          ].map(s=>(
            <div key={s.title} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{s.desc}</p>
              </div>
              <span className="text-neutral-600 text-lg">→</span>
            </div>
          ))}
          <div className="pt-4 border-t border-neutral-800">
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="rounded-lg border border-red-900 bg-red-950/30 px-4 py-2 text-sm text-red-400 hover:bg-red-950/50">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
