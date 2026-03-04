import Link from "next/link";
import { notFound } from "next/navigation";

import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { FormProcessReviewEditor } from "@/app/(workspace)/form-processes/[processId]/_components/form-process-review-editor";
import { Button } from "@/components/ui/button";
import { backendFetchFromSession } from "@/lib/api/server";

type PageProps = {
  params: Promise<{
    processId: string;
  }>;
};

async function fetchProcess(processId: string): Promise<FormProcessRead> {
  const response = await backendFetchFromSession(
    `/processes/${encodeURIComponent(processId)}`,
    {
      method: "GET",
    },
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load form process.");
  }

  return (await response.json()) as FormProcessRead;
}

export default async function FormProcessDetailPage({ params }: PageProps) {
  const { processId } = await params;
  const process = await fetchProcess(processId);
  const processForm = process.forms[0];

  if (!processForm) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Review Form Process
          </h1>
          <p className="text-sm text-zinc-500">
            Review AI-filled values, adjust fields, then finalize the process.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-lg">
          <Link href="/form-processes">Back to processes</Link>
        </Button>
      </header>

      <FormProcessReviewEditor process={process} processForm={processForm} />
    </div>
  );
}
