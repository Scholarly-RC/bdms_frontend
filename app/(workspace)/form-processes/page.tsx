import Link from "next/link";
import { FormProcessesSearchInput } from "@/app/(workspace)/form-processes/_components/form-processes-search-input";
import { FormProcessesTable } from "@/app/(workspace)/form-processes/_components/form-processes-table";
import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { Button } from "@/components/ui/button";
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

type FormProcessesPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function normalizeSearchValue(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "";
}

function buildSearchIndex(process: FormProcessRead): string {
  const currentJob = process.current_job;
  return [
    process.id,
    process.title,
    process.context,
    process.case_id ?? "",
    process.complainants.join(" "),
    process.respondents.join(" "),
    process.status,
    normalizeSearchValue(process.status),
    process.nature_of_case ?? "",
    normalizeSearchValue(process.nature_of_case),
    process.action_taken ?? "",
    normalizeSearchValue(process.action_taken),
    process.failure_reason ?? "",
    process.created_by,
    process.updated_by ?? "",
    process.created_at,
    process.updated_at,
    currentJob?.id ?? "",
    currentJob?.type ?? "",
    currentJob?.status ?? "",
    currentJob?.error ?? "",
    ...process.forms.flatMap((form) => [
      form.id,
      form.source_form_id,
      form.name,
      form.description,
      form.storage_bucket,
      form.storage_object_path,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearch(process: FormProcessRead, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return buildSearchIndex(process).includes(needle);
}

export default async function FormProcessesPage({
  searchParams,
}: FormProcessesPageProps) {
  const [processes, params] = await Promise.all([
    fetchFormProcesses(),
    searchParams,
  ]);
  const query = params.q?.trim() ?? "";
  const filteredProcesses = processes.filter((process) =>
    matchesSearch(process, query),
  );
  const hasPollableProcess = processes.some(
    (process) => process.status === "queued" || process.status === "filling",
  );
  const emptyMessage = query
    ? `No form processes match "${query}".`
    : "No form processes found.";

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormProcessesSearchInput initialValue={query} />
        <p className="text-sm text-zinc-500">
          {filteredProcesses.length} of {processes.length} processes
        </p>
      </div>

      <FormProcessesTable
        processes={filteredProcesses}
        emptyMessage={emptyMessage}
        hasPollableProcess={hasPollableProcess}
      />
    </div>
  );
}
