export default function WorkspaceLoading() {
  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100/60" />
        <section className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100/60" />
      </div>
    </main>
  );
}
