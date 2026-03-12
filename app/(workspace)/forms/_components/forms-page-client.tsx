"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { FormPreviewButton } from "@/app/(workspace)/forms/_components/form-preview-button";
import { ToggleFormStatusButton } from "@/app/(workspace)/forms/_components/toggle-form-status-button";
import type { FormRead } from "@/app/(workspace)/forms/_lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FormsPageClientProps = {
  forms: FormRead[];
};

export function FormsPageClient({ forms }: FormsPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredForms = useMemo(() => {
    if (normalizedSearch.length === 0) {
      return forms;
    }

    return forms.filter((form) =>
      buildSearchIndex(form).includes(normalizedSearch),
    );
  }, [forms, normalizedSearch]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchTerm}
            placeholder="Search forms"
            className="border-zinc-300 bg-white pl-9"
            onChange={(event) => {
              setSearchTerm(event.target.value);
            }}
            aria-label="Search forms"
          />
        </div>
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
              No forms match "{searchTerm.trim()}".
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
    </>
  );
}

function buildSearchIndex(form: FormRead): string {
  return [
    form.id,
    form.name,
    form.description,
    form.storage_bucket,
    form.storage_object_path,
    form.is_active ? "active" : "inactive",
    form.created_at,
    form.updated_at,
  ]
    .join(" ")
    .toLowerCase();
}
