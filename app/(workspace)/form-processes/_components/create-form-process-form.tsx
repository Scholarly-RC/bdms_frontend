"use client";

import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { createFormProcessAction } from "@/app/(workspace)/form-processes/_actions/form-processes";
import { CreateFormProcessSubmitButton } from "@/app/(workspace)/form-processes/_components/create-form-process-submit-button";
import { Pill } from "@/components/shared/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormOption = {
  id: string;
  name: string;
  description: string;
};

type CreateFormProcessFormProps = {
  forms: FormOption[];
};

export function CreateFormProcessForm({ forms }: CreateFormProcessFormProps) {
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState("");
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [context, setContext] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredForms = forms.filter((form) =>
    `${form.name} ${form.description}`
      .toLowerCase()
      .includes(searchValue.trim().toLowerCase()),
  );

  function handleFormToggle(formId: string) {
    setSelectedFormIds((current) => {
      if (current.includes(formId)) {
        return current.filter((value) => value !== formId);
      }

      return [...current, formId];
    });
  }

  const selectedForms = selectedFormIds
    .map((selectedFormId) => forms.find((form) => form.id === selectedFormId))
    .filter((form): form is FormOption => form !== undefined);
  const canSubmit =
    title.trim().length > 0 &&
    selectedFormIds.length > 0 &&
    context.trim().length > 0;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <form action={createFormProcessAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Process Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={160}
          placeholder="Enter a clear process title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="case_id">Case ID</Label>
        <Input
          id="case_id"
          name="case_id"
          maxLength={160}
          placeholder="Optional case reference"
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Source Forms</Label>
        <div className="space-y-3">
          <div ref={dropdownRef} className="relative">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between rounded-md px-3 font-normal"
              onClick={() => setIsDropdownOpen((current) => !current)}
            >
              <span className="truncate text-left text-sm">
                {selectedFormIds.length > 0
                  ? `${selectedFormIds.length} form${selectedFormIds.length === 1 ? "" : "s"} selected`
                  : "Search and select forms"}
              </span>
              <ChevronsUpDown className="size-4 text-zinc-500" />
            </Button>
            {isDropdownOpen ? (
              <div className="absolute z-10 mt-2 w-full rounded-md border border-zinc-200 bg-white p-2 shadow-lg">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search forms..."
                    className="pl-9"
                  />
                </div>
                <div className="mt-2 max-h-56 overflow-y-auto">
                  {filteredForms.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-zinc-500">
                      No matching forms.
                    </p>
                  ) : (
                    filteredForms.map((form) => {
                      const isSelected = selectedFormIds.includes(form.id);

                      return (
                        <button
                          key={form.id}
                          type="button"
                          className="flex w-full items-start justify-between gap-3 rounded-lg border border-transparent px-3 py-3 text-left hover:border-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleFormToggle(form.id)}
                        >
                          <span className="min-w-0 space-y-1">
                            <span className="block text-sm font-semibold leading-5 text-zinc-900">
                              {form.description || "No description"}
                            </span>
                            <span className="block text-xs tracking-wide text-zinc-500">
                              {form.name}
                            </span>
                          </span>
                          {isSelected ? (
                            <Check className="mt-1 size-4 shrink-0 text-zinc-700" />
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
          {selectedForms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedForms.map((form) => (
                <Pill
                  key={form.id}
                  value={form.name}
                  titleCase={false}
                  variant="secondary"
                  className="gap-1 bg-zinc-100 text-zinc-700"
                  title={form.description || undefined}
                >
                  <input type="hidden" name="form_ids" value={form.id} />
                  <button
                    type="button"
                    className="rounded-full text-zinc-500 hover:text-zinc-900"
                    onClick={() => handleFormToggle(form.id)}
                    aria-label={`Remove ${form.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </Pill>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="context">Context</Label>
        <Textarea
          id="context"
          name="context"
          required
          maxLength={3000}
          placeholder="Provide the information the AI should use to fill the selected form."
          value={context}
          onChange={(event) => setContext(event.target.value)}
          className="h-56 overflow-y-auto resize-none"
        />
      </div>
      <CreateFormProcessSubmitButton canSubmit={canSubmit} />
    </form>
  );
}
