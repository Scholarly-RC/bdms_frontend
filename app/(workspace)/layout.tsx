import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { WorkspaceSidebar } from "@/app/(workspace)/_components/workspace-sidebar";
import { fetchAuthenticatedUserFromSession } from "@/lib/auth/server";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await fetchAuthenticatedUserFromSession();
  if (!user) {
    redirect("/login?error=Session%20expired.%20Please%20sign%20in%20again.");
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-7xl items-start gap-4 lg:grid-cols-[260px_1fr]">
        <WorkspaceSidebar appRole={user.app_role} />
        <section className="space-y-4">{children}</section>
      </div>
    </main>
  );
}
