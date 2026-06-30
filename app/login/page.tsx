export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <h1 className="text-xl font-semibold text-white">AI Business Operations Platform</h1>
        <p className="mt-2 text-sm text-neutral-400">Sign in to manage your business with your AI employee.</p>
        <a
          href="/api/auth/google/login"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Continue with Google
        </a>
      </div>
    </main>
  );
}
