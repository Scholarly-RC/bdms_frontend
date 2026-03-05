"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FormProcessFormRead,
  FormProcessRead,
} from "@/app/(workspace)/form-processes/_lib/types";
import { CandidatePdfViewer } from "@/app/(workspace)/forms/_components/candidate-pdf-viewer";
import type {
  PdfFieldCandidate,
  PdfFieldParseResult,
  SaveState,
} from "@/app/(workspace)/forms/_lib/types";
import { Pill } from "@/components/shared/pill";
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
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

type FormProcessReviewEditorProps = {
  process: FormProcessRead;
  processForm: FormProcessFormRead;
};

const POLLABLE_STATUSES = new Set<FormProcessRead["status"]>([
  "queued",
  "filling",
]);
const POSITION_SAVE_DEBOUNCE_MS = 350;

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
  const [isUpdatingProcessStatus, setIsUpdatingProcessStatus] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectedFieldsListRef = useRef<HTMLDivElement | null>(null);
  const isEditable = process.status === "ready_for_review";
  const isFinalized = process.status === "finalized";
  const finalizedFileUrl = `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/file`;

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
  }, []);

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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

  const { run: queuePositionSave } = useDebouncedCallback<PdfFieldCandidate[]>(
    (nextCandidates) => {
      void savePayload(nextCandidates).catch(() => {
        setSaveState("error");
      });
    },
    POSITION_SAVE_DEBOUNCE_MS,
  );

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

  async function handleProcessStatusChange(
    nextStatus: "finalized" | "ready_for_review",
  ) {
    setIsUpdatingProcessStatus(true);
    try {
      const response = await fetch(
        `/api/processes/${encodeURIComponent(process.id)}`,
        {
          body: JSON.stringify({ status: nextStatus }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to update form process status.");
      }

      router.refresh();
    } finally {
      setIsUpdatingProcessStatus(false);
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
            {!isEditable && !isFinalized ? (
              <p className="text-sm text-zinc-500">
                Field editing unlocks once the process reaches Ready for review.
              </p>
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
                  disabled={
                    isUpdatingProcessStatus || (!isEditable && !isFinalized)
                  }
                  onClick={() => {
                    void handleProcessStatusChange(
                      isFinalized ? "ready_for_review" : "finalized",
                    );
                  }}
                >
                  {isUpdatingProcessStatus ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : isFinalized ? (
                    <>
                      <Pencil className="size-4" />
                      Revert to review
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Finalize
                    </>
                  )}
                </Button>
                {isEditable ? (
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
                ) : null}
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
                {isFinalized ? (
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5"
                  >
                    <a href={finalizedFileUrl}>
                      <Download className="size-4" />
                      Download
                    </a>
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

            <CandidatePdfViewer
              activeCandidateIndex={activeCandidateIndex}
              candidates={candidates}
              createCandidateRequest={0}
              fileUrl={`/api/forms/${encodeURIComponent(processForm.source_form_id)}/file`}
              isEditable={isEditable}
              onCommitCandidates={queuePositionSave}
              onSetCandidates={setCandidates}
              showBboxes={!isFinalized && !isPreviewMode}
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
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
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
                    </button>
                    {isActive && isEditable ? (
                      <span
                        className="absolute right-3 bottom-3 flex items-center gap-1"
                        aria-hidden="true"
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
                      </span>
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
      <Pill
        value="saving"
        icon={<LoaderCircle className="size-3.5 animate-spin" />}
        variant="outline"
        className="border-zinc-300 bg-white py-1.5 text-zinc-600"
      />
    );
  }
  if (saveState === "saved") {
    return (
      <Pill
        value="saved"
        icon={<CheckCircle2 className="size-3.5" />}
        variant="outline"
        className="border-emerald-300 bg-emerald-50 py-1.5 text-emerald-700"
      />
    );
  }
  return (
    <Pill
      value="save_failed"
      icon={<TriangleAlert className="size-3.5" />}
      variant="outline"
      className="border-amber-300 bg-amber-50 py-1.5 text-amber-800"
    />
  );
}

function StatusBadge({ status }: { status: FormProcessRead["status"] }) {
  return (
    <Pill
      value={status}
      normalizeValue
      titleCase
      variant="secondary"
      className="bg-zinc-100 text-zinc-700"
    />
  );
}
