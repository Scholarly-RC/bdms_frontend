import { CreateFormDialog } from "@/app/(workspace)/forms/_components/create-form-dialog";
import { DeleteFormButton } from "@/app/(workspace)/forms/_components/delete-form-button";
import { ExtractFieldsButton } from "@/app/(workspace)/forms/_components/extract-fields-button";
import type { FormRead } from "@/app/(workspace)/forms/_lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { backendFetchFromSession } from "@/lib/api/server";

async function fetchForms(): Promise<FormRead[]> {
  const response = await backendFetchFromSession("/forms", { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to load forms.");
  }

  const payload = (await response.json()) as FormRead[];
  return payload;
}

export default async function FormsPage() {
  const forms = await fetchForms();

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Forms
          </h1>
          <p className="text-sm text-zinc-500">
            Existing forms from backend API.
          </p>
        </div>
        <CreateFormDialog />
      </header>
      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardContent className="space-y-3">
          {forms.length === 0 ? (
            <p className="pt-6 text-sm text-zinc-600">No forms found.</p>
          ) : (
            forms.map((form) => (
              <div
                key={form.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-zinc-900">{form.name}</p>
                    <p className="text-sm text-zinc-600">{form.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExtractFieldsButton
                      formId={form.id}
                      existingResult={form.extracted_fields_json}
                      extractedFieldsCount={form.extracted_fields_count}
                    />
                    <DeleteFormButton formId={form.id} formName={form.name} />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  File: {form.storage_bucket}/{form.storage_object_path}
                </p>
                <p className="text-xs text-zinc-500">
                  Status: {form.is_active ? "Active" : "Inactive"}
                </p>
                <p className="text-xs text-zinc-500">
                  Extracted fields: {form.extracted_fields_count}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
