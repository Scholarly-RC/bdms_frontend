"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Pencil,
  LoaderCircle,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import type {
  FormRead,
  PdfFieldCandidate,
  PdfFieldParseResult,
  SaveState,
} from "@/app/(workspace)/forms/_lib/types";
import { PdfPreviewViewer } from "@/app/(workspace)/forms/[formId]/preview/_components/pdf-preview-viewer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type FormPreviewEditorProps = {
  form: FormRead;
};

export function FormPreviewEditor({ form }: FormPreviewEditorProps) {
  const initialResult: PdfFieldParseResult = useMemo(
    () =>
      form.extracted_fields_json ?? {
        candidates: [],
        pdf_path: `${form.storage_bucket}/${form.storage_object_path}`,
        total_candidates: 0,
      },
    [form],
  );

  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<PdfFieldCandidate[]>(
    initialResult.candidates,
  );
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [pendingValueEditIndex, setPendingValueEditIndex] = useState<number | null>(null);
  const [pendingValue, setPendingValue] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savePayload = useCallback(
    async (nextCandidates: PdfFieldCandidate[]) => {
      setSaveState("saving");
      const payload: PdfFieldParseResult = {
        ...initialResult,
        candidates: nextCandidates,
        total_candidates: nextCandidates.length,
      };

      const response = await fetch(
        `/api/forms/${encodeURIComponent(form.id)}/extracted-fields`,
        {
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PUT",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to persist field changes.");
      }

      setSaveState("saved");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveState("idle");
      }, 1200);
    },
    [form.id, initialResult],
  );

  const handleCandidateChange = useCallback(
    (candidateIndex: number, nextBbox: PdfFieldCandidate["bbox"]) => {
      setCandidates((current) =>
        current.map((candidate, index) =>
          index === candidateIndex ? { ...candidate, bbox: nextBbox } : candidate,
        ),
      );
    },
    [],
  );

  const handleCandidateSelect = useCallback((candidateIndex: number | null) => {
    if (candidateIndex === null) {
      setActiveCandidateIndex(null);
      return;
    }

    setActiveCandidateIndex((current) =>
      current === candidateIndex ? null : candidateIndex,
    );
  }, []);

  const handleCandidateDelete = useCallback(
    async (candidateIndex: number) => {
      setSaveState("saving");

      const response = await fetch(
        `/api/forms/${encodeURIComponent(form.id)}/extracted-fields`,
        {
          body: JSON.stringify({ candidateIndex }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to delete extracted field.");
      }

      const payload = (await response.json()) as PdfFieldParseResult;
      setCandidates(payload.candidates);
      setActiveCandidateIndex((current) => {
        if (current === null) {
          return null;
        }
        if (current === candidateIndex) {
          return null;
        }
        if (current > candidateIndex) {
          return current - 1;
        }
        return current;
      });
      setSaveState("saved");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveState("idle");
      }, 1200);
    },
    [form.id],
  );

  const handleCandidateValueSave = useCallback(async () => {
    if (pendingValueEditIndex === null) {
      return;
    }

    setSaveState("saving");
    const response = await fetch(
      `/api/forms/${encodeURIComponent(form.id)}/extracted-fields`,
      {
        body: JSON.stringify({
          candidateIndex: pendingValueEditIndex,
          value: pendingValue,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      },
    );

    if (!response.ok) {
      throw new Error("Unable to update extracted field value.");
    }

    const payload = (await response.json()) as PdfFieldParseResult;
    setCandidates(payload.candidates);
    setSaveState("saved");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveState("idle");
    }, 1200);
    setPendingValueEditIndex(null);
    setPendingValue("");
  }, [form.id, pendingValue, pendingValueEditIndex]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.28em] text-zinc-500 uppercase">
            PDF Preview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            {form.name}
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600">{form.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveBadge saveState={saveState} />
          <Button type="button" variant="outline" asChild>
            <Link href="/forms">Back to Forms</Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <Card className="min-w-0 flex-1 border-zinc-300/70 bg-white/85 backdrop-blur-sm">
          <CardContent>
            <PdfPreviewViewer
              activeCandidateIndex={activeCandidateIndex}
              candidates={candidates}
              fileUrl={`/api/forms/${encodeURIComponent(form.id)}/file`}
              onCandidateChange={handleCandidateChange}
              onCandidateCommit={() => {
                const nextCandidates = candidates;
                void savePayload(nextCandidates).catch(() => {
                  setSaveState("error");
                });
              }}
              onCandidateSelect={handleCandidateSelect}
            />
          </CardContent>
        </Card>

        <div className="space-y-4 xl:w-[320px] xl:shrink-0">
          <Card className="border-zinc-300/70 bg-white/85 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Detected Fields</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[32rem] space-y-2 overflow-y-auto pr-2 [overflow-anchor:none]">
              {candidates.length === 0 ? (
                <p className="text-sm text-zinc-600">
                  No saved extraction data is available yet.
                </p>
              ) : (
                candidates.map((candidate, index) => {
                  const isActive = index === activeCandidateIndex;
                  return (
                    <div
                      key={`${candidate.page}-${candidate.span_index}-${index}`}
                      data-detected-field-index={index}
                      className={`relative rounded-lg border p-3 transition ${
                        isActive
                          ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200"
                          : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                      }`}
                      onClick={() => {
                        handleCandidateSelect(index);
                      }}
                      >
                        <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex w-full items-start justify-between gap-3 pr-10 text-left">
                          <div className="min-w-0">
                            <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
                              Name
                            </p>
                            <p className="truncate text-sm font-medium text-zinc-900">
                              {getCandidateDisplayName(candidate)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
                            Value
                          </p>
                          <p className="text-sm text-zinc-700">
                            {candidate.value?.trim() ? (
                              candidate.value
                            ) : (
                              <span className="text-zinc-400">No value</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {isActive ? (
                        <div
                          className="absolute top-3 right-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-full"
                            title="Modify value"
                            onClick={() => {
                              setPendingValueEditIndex(index);
                              setPendingValue(candidate.value ?? "");
                            }}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Modify value</span>
                          </Button>
                        </div>
                      ) : null}
                      {isActive ? (
                        <div
                          className="absolute right-3 bottom-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full border-0 p-0 text-zinc-500 shadow-none hover:bg-transparent hover:text-red-600"
                            onClick={() => {
                              setPendingDeleteIndex(index);
                            }}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete extracted field</span>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={pendingValueEditIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingValueEditIndex(null);
            setPendingValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modify field value</DialogTitle>
            <DialogDescription>
              Update the detected field value for this form preview.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="candidate-value-modal"
              className="block text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
            >
              Value
            </label>
            <Input
              id="candidate-value-modal"
              value={pendingValue}
              placeholder="Enter value"
              className="bg-white"
              onChange={(event) => {
                setPendingValue(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCandidateValueSave().catch(() => {
                    setSaveState("error");
                  });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingValueEditIndex(null);
                setPendingValue("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleCandidateValueSave().catch(() => {
                  setSaveState("error");
                });
              }}
            >
              Save value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteIndex(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete extracted field?</DialogTitle>
            <DialogDescription>
              This removes the selected field from the saved extraction data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDeleteIndex(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingDeleteIndex === null) {
                  return;
                }

                handleCandidateDelete(pendingDeleteIndex)
                  .catch(() => {
                    setSaveState("error");
                  })
                  .finally(() => {
                    setPendingDeleteIndex(null);
                  });
              }}
            >
              Delete field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getCandidateDisplayName(candidate: PdfFieldCandidate): string {
  const suggestedLabel = normalizeCandidateText(candidate.label);
  if (suggestedLabel) {
    return suggestedLabel;
  }

  const suggestedName = normalizeCandidateText(candidate.name);
  if (suggestedName) {
    return suggestedName;
  }

  const anchorLabel = normalizeCandidateText(candidate.anchor_before);
  if (anchorLabel) {
    return anchorLabel;
  }

  const lineLabel = normalizeCandidateText(candidate.line_text);
  if (lineLabel) {
    return lineLabel;
  }

  return candidate.kind;
}

function normalizeCandidateText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function SaveBadge({ saveState }: { saveState: SaveState }) {
  if (saveState === "idle") {
    return null;
  }

  if (saveState === "saving") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600">
        <LoaderCircle className="size-3.5 animate-spin" />
        Saving...
      </div>
    );
  }

  if (saveState === "saved") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
        <CheckCircle2 className="size-3.5" />
        Saved
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
      <TriangleAlert className="size-3.5" />
      Save failed
    </div>
  );
}
