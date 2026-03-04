import Link from "next/link";

import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { FormProcessesTable } from "@/app/(workspace)/form-processes/_components/form-processes-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { backendFetchFromSession } from "@/lib/api/server";

async function fetchFormProcesses(): Promise<FormProcessRead[]> {
  const response = await backendFetchFromSession("/processes", {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Unable to load form processes.");
  }

  const payload = (await response.json()) as FormProcessRead[];
  return payload;
}

export default async function FormProcessesPage() {
  const processes = await fetchFormProcesses();

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Form Processes
          </h1>
          <p className="text-sm text-zinc-500">
            Review process runs and open items that need attention.
          </p>
        </div>
        <Button asChild className="rounded-lg">
          <Link href="/form-processes/new">Create process</Link>
        </Button>
      </header>

      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardContent className="p-0">
          {processes.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-600">
              No form processes found.
            </p>
          ) : (
            <FormProcessesTable processes={processes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
