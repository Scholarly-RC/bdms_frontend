import { FormPreviewButton } from "@/app/(workspace)/forms/_components/form-preview-button";
import { FormsSearchInput } from "@/app/(workspace)/forms/_components/forms-search-input";
import { ToggleFormStatusButton } from "@/app/(workspace)/forms/_components/toggle-form-status-button";
import type { FormRead } from "@/app/(workspace)/forms/_lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { backendFetchFromSession } from "@/lib/api/server";

const formNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

async function fetchForms(): Promise<FormRead[]> {
  const response = await backendFetchFromSession("/forms", { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to load forms.");
  }

  const payload = (await response.json()) as FormRead[];
  return payload.sort((left, right) =>
    formNameCollator.compare(left.name, right.name),
  );
}

type FormsPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function matchesSearch(form: FormRead, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return `${form.name} ${form.description}`.toLowerCase().includes(needle);
}

export default async function FormsPage({ searchParams }: FormsPageProps) {
  const [forms, params] = await Promise.all([fetchForms(), searchParams]);
  const query = params.q?.trim() ?? "";
  const filteredForms = forms.filter((form) => matchesSearch(form, query));

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
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormsSearchInput initialValue={query} />
        <p className="text-sm text-zinc-500">
          {filteredForms.length} of {forms.length} forms
        </p>
      </div>
      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardContent className="space-y-3">
          {forms.length === 0 ? (
            <p className="pt-6 text-sm text-zinc-600">No forms found.</p>
          ) : filteredForms.length === 0 ? (
            <p className="pt-6 text-sm text-zinc-600">
              No forms match "{query}".
            </p>
          ) : (
            filteredForms.map((form) => (
              <div
                key={form.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-zinc-900">
                      {form.description}
                    </p>
                    <p className="text-sm text-zinc-600">{form.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FormPreviewButton
                      formDescription={form.description}
                      formId={form.id}
                      formName={form.name}
                    />
                    <ToggleFormStatusButton
                      formId={form.id}
                      formName={form.name}
                      isActive={form.is_active}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  File: {form.storage_bucket}/{form.storage_object_path}
                </p>
                <p className="text-xs text-zinc-500">
                  Status: {form.is_active ? "Active" : "Inactive"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
