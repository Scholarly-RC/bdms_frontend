import Link from "next/link";
import { notFound } from "next/navigation";

import { sortFormsByName } from "@/app/(workspace)/form-processes/_lib/forms";
import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { FormProcessReviewEditor } from "@/app/(workspace)/form-processes/[processId]/_components/form-process-review-editor";
import { ProcessFormSelector } from "@/app/(workspace)/form-processes/[processId]/_components/process-form-selector";
import type { FormRead } from "@/app/(workspace)/forms/_lib/types";
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

async function fetchForms(): Promise<FormRead[]> {
  const response = await backendFetchFromSession("/forms", { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to load forms.");
  }

  const payload = (await response.json()) as FormRead[];
  return sortFormsByName(payload);
}

export default async function FormProcessDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { processId } = await params;
  const { formId } = await searchParams;
  const [process, allForms] = await Promise.all([
    fetchProcess(processId),
    fetchForms(),
  ]);
  const processForm =
    process.forms.find((form) => form.id === formId) ?? process.forms[0];
  const selectorOptions = process.forms.map((form) => ({
    id: form.id,
    name: form.name,
    description: form.description,
    sourceFormId: form.source_form_id,
  }));
  const availableBaseForms = allForms
    .filter(
      (form) =>
        !process.forms.some(
          (processFormItem) => processFormItem.source_form_id === form.id,
        ),
    )
    .map((form) => ({
      id: form.id,
      name: form.name,
      description: form.description,
    }));

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
          {selectorOptions.length > 1 || availableBaseForms.length > 0 ? (
            <ProcessFormSelector
              processId={process.id}
              options={selectorOptions}
              selectedFormId={processForm.id}
              availableBaseForms={availableBaseForms}
              isProcessLocked={process.status === "finalized"}
            />
          ) : null}
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-lg px-3 text-sm"
          >
            <Link href="/form-processes">Back to processes</Link>
          </Button>
        </div>
      </header>

      <FormProcessReviewEditor process={process} processForm={processForm} />
    </div>
  );
}
