import { notFound } from "next/navigation";

import type { FormRead } from "@/app/(workspace)/forms/_lib/types";
import { FormPreviewEditor } from "@/app/(workspace)/forms/[formId]/preview/_components/form-preview-editor";
import { backendFetchFromSession } from "@/lib/api/server";

type PreviewPageProps = {
  params: Promise<{
    formId: string;
  }>;
};

async function fetchForm(formId: string): Promise<FormRead> {
  const response = await backendFetchFromSession(
    `/forms/${encodeURIComponent(formId)}`,
    {
      method: "GET",
    },
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load form preview.");
  }

  return (await response.json()) as FormRead;
}

export default async function FormPreviewPage({ params }: PreviewPageProps) {
  const { formId } = await params;
  const form = await fetchForm(formId);

  return <FormPreviewEditor form={form} />;
}
