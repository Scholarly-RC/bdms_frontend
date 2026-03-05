import Link from "next/link";
import { notFound } from "next/navigation";

import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { FormProcessReviewEditor } from "@/app/(workspace)/form-processes/[processId]/_components/form-process-review-editor";
import { ProcessFormSelector } from "@/app/(workspace)/form-processes/[processId]/_components/process-form-selector";
import { Button } from "@/components/ui/button";
import { backendFetchFromSession } from "@/lib/api/server";

type PageProps = {
  params: Promise<{
    processId: string;
  }>;
  searchParams: Promise<{
    formId?: string;
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

export default async function FormProcessDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { processId } = await params;
  const { formId } = await searchParams;
  const process = await fetchProcess(processId);
  const processForm =
    process.forms.find((form) => form.id === formId) ?? process.forms[0];

  if (!processForm) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            {process.title}
          </h1>
          <p className="text-sm font-medium text-zinc-800">
            {processForm.name}
          </p>
          {processForm.description ? (
            <p className="text-sm text-zinc-600">{processForm.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          {process.forms.length > 1 ? (
            <div className="space-y-1">
              <ProcessFormSelector
                options={process.forms.map((form) => ({
                  id: form.id,
                  name: form.name,
                }))}
                selectedFormId={processForm.id}
              />
            </div>
          ) : null}
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/form-processes">Back to processes</Link>
          </Button>
        </div>
      </header>

      <FormProcessReviewEditor process={process} processForm={processForm} />
    </div>
  );
}
