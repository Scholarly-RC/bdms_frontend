"use client";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  PdfFieldCandidate,
  PdfFieldParseResult,
  SaveState,
} from "@/app/(workspace)/forms/_lib/types";
import type {
  FormProcessFormRead,
  FormProcessRead,
} from "@/app/(workspace)/form-processes/_lib/types";
import { PdfPreviewViewer } from "@/app/(workspace)/forms/[formId]/preview/_components/pdf-preview-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type FormProcessReviewEditorProps = {
  process: FormProcessRead;
  processForm: FormProcessFormRead;
};

const POLLABLE_STATUSES = new Set<FormProcessRead["status"]>([
  "queued",
  "filling",
]);

export function FormProcessReviewEditor({
  process,
  processForm,
}: FormProcessReviewEditorProps) {
  const router = useRouter();
  const initialResult: PdfFieldParseResult = useMemo(
    () =>
      processForm.extracted_fields_json ?? {
        candidates: [],
        pdf_path: `${processForm.storage_bucket}/${processForm.storage_object_path}`,
        total_candidates: 0,
      },
    [processForm],
  );
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<
    number | null
  >(null);
  const [candidates, setCandidates] = useState<PdfFieldCandidate[]>(
    initialResult.candidates,
  );
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null,
  );
  const [pendingValueEditIndex, setPendingValueEditIndex] = useState<
    number | null
  >(null);
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("");
  const [pendingRule, setPendingRule] = useState("");
  const [pendingValue, setPendingValue] = useState("");
  const [isSubmittingFieldEdit, setIsSubmittingFieldEdit] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectedFieldsListRef = useRef<HTMLDivElement | null>(null);
  const isEditable = process.status === "ready_for_review";
  const isFinalized = process.status === "finalized";
  const filledCount = candidates.filter(
    (candidate) => candidate.value.trim().length > 0,
  ).length;
  const emptyCount = candidates.length - filledCount;

  useEffect(() => {
    if (!POLLABLE_STATUSES.has(process.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 5000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [process.status, router]);

  const sortedCandidates = useMemo(
    () =>
      candidates
        .map((candidate, index) => ({ candidate, index }))
        .sort((left, right) =>
          compareCandidatesByPdfPosition(left.candidate, right.candidate),
        ),
    [candidates],
  );

  useEffect(() => {
    setCandidates(initialResult.candidates);
  }, [initialResult]);

  useEffect(() => {
    setActiveCandidateIndex(null);
  }, [processForm.id]);

  useEffect(() => {
    if (activeCandidateIndex === null) {
      return;
    }

    const listElement = detectedFieldsListRef.current;
    const activeCard = listElement?.querySelector<HTMLElement>(
      `[data-detected-field-index="${activeCandidateIndex}"]`,
    );

    activeCard?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeCandidateIndex]);

  async function savePayload(nextCandidates: PdfFieldCandidate[]) {
    setSaveState("saving");
    const payload: PdfFieldParseResult = {
      ...initialResult,
      candidates: nextCandidates,
      total_candidates: nextCandidates.length,
    };

    const response = await fetch(
      `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/extracted-fields`,
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

    markSaved();
  }

  function markSaved() {
    setSaveState("saved");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveState("idle");
    }, 1200);
  }

  async function handleCandidateDelete(candidateIndex: number) {
    setSaveState("saving");
    const response = await fetch(
      `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/extracted-fields`,
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
      return current > candidateIndex ? current - 1 : current;
    });
    markSaved();
  }

  async function handleCandidateValueSave() {
    if (pendingValueEditIndex === null) {
      return;
    }

    setSaveState("saving");
    setIsSubmittingFieldEdit(true);
    try {
      const response = await fetch(
        `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/extracted-fields`,
        {
          body: JSON.stringify({
            candidateIndex: pendingValueEditIndex,
            label: pendingLabel,
            name: normalizeFieldName(pendingLabel),
            rule: pendingRule,
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
      markSaved();
      setPendingValueEditIndex(null);
      setPendingLabel("");
      setPendingRule("");
      setPendingValue("");
    } finally {
      setIsSubmittingFieldEdit(false);
    }
  }

  async function handleFinalize() {
    setIsFinalizing(true);
    try {
      const response = await fetch(
        `/api/processes/${encodeURIComponent(process.id)}`,
        {
          body: JSON.stringify({ status: "finalized" }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to finalize form process.");
      }

      router.refresh();
    } finally {
      setIsFinalizing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-zinc-300/70 bg-white/85 backdrop-blur-sm">
          <CardContent className="space-y-4">
            {process.failure_reason ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {process.failure_reason}
              </div>
            ) : null}
            {process.current_job ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                Job progress: {process.current_job.progress}% ·{" "}
                {process.current_job.status.replaceAll("_", " ")}
              </div>
            ) : null}
            {!isEditable ? (
              <p className="text-sm text-zinc-500">
                {isFinalized
                  ? "This process is finalized and read-only."
                  : "Field editing unlocks once the process reaches Ready for review."}
              </p>
            ) : null}
            {isFinalized ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  label="Total fields"
                  value={String(candidates.length)}
                />
                <SummaryCard
                  label="Filled values"
                  value={String(filledCount)}
                />
                <SummaryCard label="Empty values" value={String(emptyCount)} />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={process.status} />
                <SaveBadge saveState={saveState} />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2.5"
                  disabled={!isEditable || isFinalizing}
                  onClick={() => {
                    void handleFinalize();
                  }}
                >
                  {isFinalizing ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Finalize
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => {
                    setIsPreviewMode((current) => !current);
                  }}
                >
                  {isPreviewMode ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  Preview
                </Button>
                {POLLABLE_STATUSES.has(process.status) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => {
                      router.refresh();
                    }}
                  >
                    <RefreshCw className="size-4" />
                    Refresh
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => {
                    setIsContextDialogOpen(true);
                  }}
                >
                  <FileText className="size-4" />
                  Context
                </Button>
              </div>
            </div>

            <PdfPreviewViewer
              activeCandidateIndex={activeCandidateIndex}
              candidates={candidates}
              createCandidateRequest={0}
              fileUrl={`/api/forms/${encodeURIComponent(processForm.source_form_id)}/file`}
              showBboxes={!isPreviewMode}
              onCandidateChange={(candidateIndex, nextBbox) => {
                if (!isEditable) {
                  return;
                }
                setCandidates((current) =>
                  current.map((candidate, index) =>
                    index === candidateIndex
                      ? { ...candidate, bbox: nextBbox }
                      : candidate,
                  ),
                );
              }}
              onCandidateCommit={() => {
                if (!isEditable) {
                  return;
                }
                void savePayload(candidates).catch(() => {
                  setSaveState("error");
                });
              }}
              onCandidateCreate={() => {
                // Process review mode does not create new fields.
              }}
              onCandidateSelect={(candidateIndex) => {
                setActiveCandidateIndex(candidateIndex);
              }}
            />
          </CardContent>
        </Card>

        <Card className="self-start border-zinc-300/70 bg-white/85 backdrop-blur-sm lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>{isFinalized ? "Finalized Values" : "Fields"}</CardTitle>
          </CardHeader>
          <CardContent
            ref={detectedFieldsListRef}
            className="h-[calc(100vh-16rem)] space-y-2 overflow-y-auto pr-2"
          >
            {candidates.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No saved extraction data is available yet.
              </p>
            ) : (
              sortedCandidates.map(({ candidate, index }) => {
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
                      setActiveCandidateIndex((current) =>
                        current === index ? null : index,
                      );
                    }}
                  >
                    {normalizeCandidateText(candidate.rule) ? (
                      <span
                        className="absolute top-2 right-2 inline-flex size-5 items-center justify-center rounded-full bg-white/90 text-amber-600 shadow-sm"
                        title="This field has a custom rule."
                      >
                        <AlertCircle className="size-3.5" />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="pr-10 text-left">
                        <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
                          Name
                        </p>
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {getCandidateDisplayName(candidate)}
                        </p>
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
                    {isActive && isEditable ? (
                      <div
                        className="absolute right-3 bottom-3 flex items-center gap-1"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full border-0 p-0 text-zinc-500 shadow-none hover:bg-transparent hover:text-cyan-600"
                          onClick={() => {
                            setPendingValueEditIndex(index);
                            setPendingLabel(
                              getCandidateEditableLabel(candidate),
                            );
                            setPendingRule(candidate.rule ?? "");
                            setPendingValue(candidate.value ?? "");
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
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

      <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process context</DialogTitle>
            <DialogDescription>
              Reference text used to generate values for this process.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {process.context}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsContextDialogOpen(false);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingValueEditIndex !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmittingFieldEdit) {
            setPendingValueEditIndex(null);
            setPendingLabel("");
            setPendingRule("");
            setPendingValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modify field</DialogTitle>
            <DialogDescription>
              Adjust the copied field label, custom rule, and current value for
              this process.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="candidate-label-modal"
              className="block text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
            >
              Label
            </label>
            <Input
              id="candidate-label-modal"
              value={pendingLabel}
              className="bg-white"
              disabled={isSubmittingFieldEdit}
              onChange={(event) => {
                setPendingLabel(event.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="candidate-rule-modal"
              className="block text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
            >
              Rule
            </label>
            <Input
              id="candidate-rule-modal"
              value={pendingRule}
              className="bg-white"
              disabled={isSubmittingFieldEdit}
              onChange={(event) => {
                setPendingRule(event.target.value);
              }}
            />
          </div>
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
              className="bg-white"
              disabled={isSubmittingFieldEdit}
              onChange={(event) => {
                setPendingValue(event.target.value);
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingFieldEdit}
              onClick={() => {
                setPendingValueEditIndex(null);
                setPendingLabel("");
                setPendingRule("");
                setPendingValue("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmittingFieldEdit}
              onClick={() => {
                void handleCandidateValueSave().catch(() => {
                  setSaveState("error");
                });
              }}
            >
              {isSubmittingFieldEdit ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save field"
              )}
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
              This removes the selected field from the copied process form.
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

function normalizeCandidateText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
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

function getCandidateEditableLabel(candidate: PdfFieldCandidate): string {
  return (
    normalizeCandidateText(candidate.label) ||
    getCandidateDisplayName(candidate)
  );
}

function normalizeFieldName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "field";
}

function compareCandidatesByPdfPosition(
  left: PdfFieldCandidate,
  right: PdfFieldCandidate,
): number {
  if (left.page !== right.page) {
    return left.page - right.page;
  }
  if (left.bbox[1] !== right.bbox[1]) {
    return left.bbox[1] - right.bbox[1];
  }
  if (left.bbox[0] !== right.bbox[0]) {
    return left.bbox[0] - right.bbox[0];
  }
  return left.span_index - right.span_index;
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

function StatusBadge({ status }: { status: FormProcessRead["status"] }) {
  return (
    <Badge
      variant="secondary"
      className="rounded-full bg-zinc-100 text-zinc-700"
    >
      {status === "ready_for_review"
        ? "Ready for review"
        : status.replaceAll("_", " ")}
    </Badge>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
