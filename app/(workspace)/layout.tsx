import type { ReactNode } from "react";

import { WorkspaceSidebar } from "@/app/(workspace)/_components/workspace-sidebar";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[260px_1fr]">
        <WorkspaceSidebar />
        <section className="space-y-4">{children}</section>
      </div>
    </main>
  );
}
