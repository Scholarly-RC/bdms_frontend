"use client";

import {
  Check,
  ChevronDown,
  CirclePlus,
  LoaderCircle,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProcessFormOption = {
  id: string;
  name: string;
  description: string;
  sourceFormId: string;
};

type BaseFormOption = {
  id: string;
  name: string;
  description: string;
};

type ProcessFormSelectorProps = {
  processId: string;
  options: ProcessFormOption[];
  selectedFormId: string;
  availableBaseForms: BaseFormOption[];
  isProcessLocked: boolean;
  className?: string;
};

export function ProcessFormSelector({
  processId,
  options,
  selectedFormId,
  availableBaseForms,
  isProcessLocked,
  className,
}: ProcessFormSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedBaseFormId, setSelectedBaseFormId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const selectorRef = useRef<HTMLDivElement | null>(null);

  const selectedForm =
    options.find((option) => option.id === selectedFormId) ??
    options[0] ??
    null;

  const filteredBaseForms = useMemo(
    () =>
      availableBaseForms.filter((form) =>
        `${form.name} ${form.description}`
          .toLowerCase()
          .includes(searchValue.trim().toLowerCase()),
      ),
    [availableBaseForms, searchValue],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!selectorRef.current) {
        return;
      }

      if (!selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!isAddDialogOpen) {
      setSearchValue("");
      setSelectedBaseFormId("");
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [isAddDialogOpen]);

  function selectProcessForm(nextFormId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("formId", nextFormId);
    router.replace(`${pathname}?${nextParams.toString()}`);
    setIsSelectorOpen(false);
  }

  async function handleAddForm() {
    if (!selectedBaseFormId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/processes/${encodeURIComponent(processId)}/forms`,
        {
          body: JSON.stringify({ formId: selectedBaseFormId }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        detail?: string;
        forms?: Array<{
          id: string;
          source_form_id: string;
        }>;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.detail || "Unable to add form to process.");
      }

      setIsAddDialogOpen(false);
      const addedFormId =
        payload?.forms?.find(
          (form) => form.source_form_id === selectedBaseFormId,
        )?.id ?? null;

      if (addedFormId) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("formId", addedFormId);
        router.replace(`${pathname}?${nextParams.toString()}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to add form to process.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center justify-end gap-2",
          className,
        )}
      >
        <div ref={selectorRef} className="relative min-w-[13rem] max-w-[16rem]">
          <button
            type="button"
            className="group flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
            onClick={() => setIsSelectorOpen((current) => !current)}
            aria-expanded={isSelectorOpen}
            aria-haspopup="listbox"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-zinc-950">
                {selectedForm?.name ?? "Select a form"}
              </span>
            </span>
            <span className="text-xs text-zinc-500">{options.length}</span>
            <span className="flex size-6 shrink-0 items-center justify-center text-zinc-500 transition group-hover:text-zinc-700">
              <ChevronDown
                className={cn(
                  "size-4 transition",
                  isSelectorOpen ? "rotate-180" : "",
                )}
              />
            </span>
          </button>
          {isSelectorOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
              <div className="max-h-72 overflow-y-auto p-1.5">
                {options.map((option) => {
                  const isSelected = option.id === selectedFormId;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded-md px-2.5 py-2 text-left transition",
                        isSelected
                          ? "bg-zinc-950 text-white"
                          : "hover:bg-zinc-100",
                      )}
                      onClick={() => selectProcessForm(option.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {option.name}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block truncate text-xs",
                            isSelected ? "text-zinc-300" : "text-zinc-500",
                          )}
                        >
                          {option.description || "No description"}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check className="mt-0.5 size-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-lg border-zinc-300 px-3 text-sm"
          disabled={isProcessLocked || availableBaseForms.length === 0}
          onClick={() => setIsAddDialogOpen(true)}
        >
          <CirclePlus className="size-4" />
          Add Another Form
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Another Form</DialogTitle>
            <DialogDescription>
              Only base forms not already copied into this process are shown
              here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search available forms..."
                className="pl-9"
              />
            </div>

            <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/60 p-2">
              {filteredBaseForms.length === 0 ? (
                <div className="rounded-lg px-3 py-8 text-center text-sm text-zinc-500">
                  No available forms match your search.
                </div>
              ) : (
                filteredBaseForms.map((form) => {
                  const isSelected = form.id === selectedBaseFormId;

                  return (
                    <button
                      key={form.id}
                      type="button"
                      className={cn(
                        "mb-2 flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition last:mb-0",
                        isSelected
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-transparent bg-white hover:border-zinc-200 hover:bg-zinc-100",
                      )}
                      onClick={() => setSelectedBaseFormId(form.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {form.name}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block text-xs",
                            isSelected ? "text-zinc-300" : "text-zinc-500",
                          )}
                        >
                          {form.description || "No description"}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check className="mt-0.5 size-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            {errorMessage ? (
              <p className="text-sm text-red-600">{errorMessage}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAddForm()}
              disabled={!selectedBaseFormId || isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Add Another Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
