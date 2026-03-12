"use client";

import {
  CheckCircle2,
  Download,
  Expand,
  FileText,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  FormProcessFormRead,
  FormProcessRead,
} from "@/app/(workspace)/form-processes/_lib/types";
import { PdfPreviewViewer } from "@/app/(workspace)/form-processes/[processId]/_components/pdf-preview-viewer";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
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
import { Textarea } from "@/components/ui/textarea";

type FormProcessReviewEditorProps = {
  process: FormProcessRead;
  processForm: FormProcessFormRead;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const POLLABLE_STATUSES = new Set<FormProcessRead["status"]>([
  "queued",
  "filling",
]);

export function FormProcessReviewEditor({
  process,
  processForm,
}: FormProcessReviewEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPayload = useMemo(
    () => normalizePayload(processForm.payload_json),
    [processForm.payload_json],
  );
  const [payloadJson, setPayloadJson] =
    useState<Record<string, unknown>>(initialPayload);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isUpdatingProcessStatus, setIsUpdatingProcessStatus] = useState(false);
  const [isSavingPayload, setIsSavingPayload] = useState(false);
  const [isDeletingForm, setIsDeletingForm] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [draftContext, setDraftContext] = useState(process.context);
  const [contextErrorMessage, setContextErrorMessage] = useState("");
  const [isRerunningProcess, setIsRerunningProcess] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);
  const isEditable = process.status === "ready_for_review";
  const isFinalized = process.status === "finalized";
  const isProcessRunning = POLLABLE_STATUSES.has(process.status);
  const canDeleteCurrentForm = !isFinalized && process.forms.length > 1;
  const trimmedDraftContext = draftContext.trim();
  const contextWordCount = countWords(trimmedDraftContext);
  const isContextChanged =
    normalizeContext(trimmedDraftContext) !== normalizeContext(process.context);
  const canModifyContext = !isFinalized && !isProcessRunning;
  const canSubmitContextRerun =
    canModifyContext &&
    isContextChanged &&
    contextWordCount >= 15 &&
    trimmedDraftContext.length > 0 &&
    !isRerunningProcess;
  const finalizedPdfFileUrl = `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/file?format=pdf`;
  const finalizedWordFileUrl = `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/file?format=word`;
  const previewRequestVersion = `${process.status}:${processForm.id}:${processForm.payload_updated_at ?? "pending"}:${previewVersion}`;
  const previewFileUrl = `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/preview-file?v=${encodeURIComponent(previewRequestVersion)}`;
  const fields = useMemo(
    () => flattenPayloadFields(payloadJson, processForm.payload_field_order),
    [payloadJson, processForm.payload_field_order],
  );
  const hasUnsavedChanges = useMemo(
    () => !arePayloadsEqual(payloadJson, initialPayload),
    [initialPayload, payloadJson],
  );

  useEffect(() => {
    setPayloadJson(initialPayload);
  }, [initialPayload]);

  useEffect(() => {
    setDraftContext(process.context);
  }, [process.context]);

  useEffect(() => {
    setIsPreviewLoading(true);
  }, []);

  useEffect(() => {
    if (!isContextDialogOpen) {
      setIsEditingContext(false);
      setDraftContext(process.context);
      setContextErrorMessage("");
      setIsRerunningProcess(false);
    }
  }, [isContextDialogOpen, process.context]);

  useEffect(() => {
    if (!isProcessRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 5000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isProcessRunning, router]);

  useEffect(() => {
    if (!isDownloadMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!downloadMenuRef.current) {
        return;
      }

      if (!downloadMenuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isDownloadMenuOpen]);

  async function persistPayload(nextPayload: Record<string, unknown>) {
    setIsSavingPayload(true);
    setSaveState("saving");
    const response = await fetch(
      `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/payload`,
      {
        body: JSON.stringify({ payload_json: nextPayload }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      },
    );

    if (!response.ok) {
      throw new Error("Unable to persist payload changes.");
    }

    setSaveState("saved");
    setPreviewVersion((current) => current + 1);
    window.setTimeout(() => {
      setSaveState("idle");
    }, 1200);
    setIsSavingPayload(false);
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

  async function handleDeleteCurrentForm() {
    setIsDeletingForm(true);
    setDeleteErrorMessage("");

    try {
      const response = await fetch(
        `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        detail?: string;
        forms?: Array<{
          id: string;
        }>;
      } | null;

      if (!response.ok) {
        const message =
          payload?.detail || "Unable to delete form from process.";
        setDeleteErrorMessage(message);
        throw new Error(message);
      }

      const nextFormId = payload?.forms?.find(
        (form) => form.id !== processForm.id,
      )?.id;
      if (!nextFormId) {
        router.push("/form-processes");
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("formId", nextFormId);
      router.replace(`${pathname}?${nextParams.toString()}`);
      router.refresh();
    } finally {
      setIsDeletingForm(false);
    }
  }

  async function handleContextRerun() {
    if (!canSubmitContextRerun) {
      return;
    }

    setIsRerunningProcess(true);
    setContextErrorMessage("");

    try {
      const response = await fetch(
        `/api/processes/${encodeURIComponent(process.id)}/rerun`,
        {
          body: JSON.stringify({ context: trimmedDraftContext }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        detail?: string;
      } | null;

      if (!response.ok) {
        setContextErrorMessage(
          payload?.detail || "Unable to rerun form process.",
        );
        return;
      }

      setIsContextDialogOpen(false);
      router.refresh();
    } finally {
      setIsRerunningProcess(false);
    }
  }

  async function handleSavePayload() {
    if (!isEditable || !hasUnsavedChanges || isSavingPayload) {
      return;
    }

    try {
      await persistPayload(payloadJson);
      router.refresh();
    } catch {
      setSaveState("error");
      setIsSavingPayload(false);
    }
  }

  function handleFieldChange(path: string, value: string) {
    const nextPayload = setPayloadValue(payloadJson, path, value);
    setPayloadJson(nextPayload);
    if (saveState !== "idle") {
      setSaveState("idle");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="border-zinc-300/70 bg-white/85 backdrop-blur-sm">
          <CardContent className="space-y-4">
            {process.failure_reason ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {process.failure_reason}
              </div>
            ) : null}
            {!isEditable && !isFinalized ? (
              <p className="text-sm text-zinc-500">
                Payload editing unlocks once the process reaches Ready for
                review.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={process.status} />
                <SaveBadge saveState={saveState} />
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2.5"
                  disabled={
                    isUpdatingProcessStatus ||
                    (!isEditable && !isFinalized) ||
                    hasUnsavedChanges
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
                {canDeleteCurrentForm ? (
                  <ConfirmationModal
                    trigger={
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 px-2.5"
                        disabled={isDeletingForm || isProcessRunning}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title="Delete this form?"
                    description={
                      isProcessRunning
                        ? "This form cannot be deleted while the process is running."
                        : `This removes ${processForm.name} from the current process. You can add it again later from the Add Another Form dialog.`
                    }
                    confirmLabel="Delete form"
                    confirmVariant="destructive"
                    isConfirming={isDeletingForm}
                    errorMessage={deleteErrorMessage}
                    onConfirm={handleDeleteCurrentForm}
                  />
                ) : null}
                {isProcessRunning ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => {
                      setIsPreviewLoading(true);
                      router.refresh();
                    }}
                  >
                    <RefreshCw className="size-4" />
                    Refresh
                  </Button>
                ) : null}
                {isFinalized ? (
                  <div ref={downloadMenuRef} className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5"
                      aria-expanded={isDownloadMenuOpen}
                      aria-haspopup="menu"
                      onClick={() => {
                        setIsDownloadMenuOpen((current) => !current);
                      }}
                    >
                      <Download className="size-4" />
                      <span className="sr-only">Download finalized file</span>
                    </Button>
                    {isDownloadMenuOpen ? (
                      <div className="absolute right-0 bottom-full z-20 mb-2 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg">
                        <a
                          href={finalizedPdfFileUrl}
                          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                          onClick={() => {
                            setIsDownloadMenuOpen(false);
                          }}
                        >
                          PDF
                        </a>
                        <a
                          href={finalizedWordFileUrl}
                          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                          onClick={() => {
                            setIsDownloadMenuOpen(false);
                          }}
                        >
                          Word
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => {
                    setIsPreviewDialogOpen(true);
                  }}
                >
                  <Expand className="size-4" />
                </Button>
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
            <div className="relative h-[78vh] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              {isProcessRunning ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/92 px-6 text-center backdrop-blur-sm">
                  <LoaderCircle className="size-8 animate-spin text-zinc-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-700">
                      This form is still being filled.
                    </p>
                    <p className="text-sm text-zinc-500">
                      PDF preview will be available once the process reaches
                      Ready for review.
                    </p>
                  </div>
                </div>
              ) : isPreviewLoading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/88 backdrop-blur-sm">
                  <LoaderCircle className="size-8 animate-spin text-zinc-500" />
                  <p className="text-sm text-zinc-600">
                    Rendering PDF preview...
                  </p>
                </div>
              ) : null}
              {isProcessRunning ? null : (
                <PdfPreviewViewer
                  key={previewFileUrl}
                  title={`${processForm.name} preview`}
                  src={previewFileUrl}
                  onLoadingStateChange={setIsPreviewLoading}
                  showZoomControls={false}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="self-start border-zinc-300/70 bg-white/85 backdrop-blur-sm lg:sticky lg:top-4">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                {isFinalized ? "Finalized Payload" : "Payload Fields"}
              </CardTitle>
              {isEditable ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2.5"
                  disabled={!hasUnsavedChanges || isSavingPayload}
                  onClick={() => {
                    void handleSavePayload();
                  }}
                >
                  {isSavingPayload ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100vh-16rem)] space-y-3 overflow-y-auto pr-2">
            {fields.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No editable payload fields are available yet.
              </p>
            ) : (
              fields.map((field) => (
                <div
                  key={field.path}
                  className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {field.label}
                  </p>
                  <Input
                    value={field.value}
                    disabled={!isEditable}
                    className="bg-white"
                    onChange={(event) => {
                      handleFieldChange(field.path, event.target.value);
                    }}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process context</DialogTitle>
            <DialogDescription>
              Review or revise the context used to generate values for this
              process.
            </DialogDescription>
          </DialogHeader>
          {isEditingContext ? (
            <div className="space-y-3">
              <Textarea
                value={draftContext}
                onChange={(event) => setDraftContext(event.target.value)}
                className="min-h-48 resize-y"
                disabled={!canModifyContext || isRerunningProcess}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>{contextWordCount} words</span>
                {!canModifyContext ? (
                  <span>
                    {isFinalized
                      ? "Finalize must be reverted before changing context."
                      : "Wait for the current run to finish before changing context."}
                  </span>
                ) : !isContextChanged ? (
                  <span>Change the context before rerunning.</span>
                ) : contextWordCount < 15 ? (
                  <span>Context must contain at least 15 words.</span>
                ) : null}
              </div>
              {contextErrorMessage ? (
                <p className="text-sm text-red-600">{contextErrorMessage}</p>
              ) : null}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {process.context}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isEditingContext) {
                  setIsEditingContext(false);
                  setDraftContext(process.context);
                  setContextErrorMessage("");
                  return;
                }
                setIsContextDialogOpen(false);
              }}
              disabled={isRerunningProcess}
            >
              {isEditingContext ? "Cancel" : "Close"}
            </Button>
            {isEditingContext ? (
              <Button
                type="button"
                onClick={() => {
                  void handleContextRerun();
                }}
                disabled={!canSubmitContextRerun}
              >
                {isRerunningProcess ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Rerunning...
                  </>
                ) : (
                  "Save and rerun all forms"
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setIsEditingContext(true)}
                disabled={!canModifyContext}
              >
                Modify
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-[95vw] p-3 pt-14 sm:max-w-[95vw]">
          <DialogHeader className="sr-only">
            <DialogTitle>{processForm.name} full screen preview</DialogTitle>
            <DialogDescription>
              Full screen PDF preview with page navigation and zoom controls.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[calc(92vh-3.5rem)] overflow-hidden rounded-lg">
            <PdfPreviewViewer
              key={`dialog-${previewFileUrl}`}
              title={`${processForm.name} preview`}
              src={previewFileUrl}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normalizePayload(
  value: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!value || Array.isArray(value)) {
    return {};
  }
  return structuredClone(value);
}

function flattenPayloadFields(
  payload: Record<string, unknown>,
  preferredOrder: string[] | null = null,
): Array<{ label: string; path: string; value: string }> {
  const fields: Array<{ label: string; path: string; value: string }> = [];

  function visit(value: unknown, path: string) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        visit(item, `${path}[${index}]`);
      });
      return;
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, nestedValue]) => {
        visit(nestedValue, path ? `${path}.${key}` : key);
      });
      return;
    }

    if (typeof value === "string") {
      fields.push({
        label: labelFromPath(path),
        path,
        value,
      });
    }
  }

  visit(payload, "");
  if (!preferredOrder || preferredOrder.length === 0) {
    return fields;
  }

  const orderIndex = new Map<string, number>(
    preferredOrder.map((path, index) => [path, index]),
  );
  fields.sort((left, right) => {
    const leftIndex = orderIndex.get(left.path);
    const rightIndex = orderIndex.get(right.path);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }
    if (leftIndex !== undefined) {
      return -1;
    }
    if (rightIndex !== undefined) {
      return 1;
    }
    return left.path.localeCompare(right.path);
  });
  return fields;
}

function setPayloadValue(
  payload: Record<string, unknown>,
  path: string,
  value: string,
): Record<string, unknown> {
  const nextPayload = structuredClone(payload);
  let current: unknown = nextPayload;
  const tokens = tokenizePath(path);

  tokens.slice(0, -1).forEach((token) => {
    if (typeof token === "number" && Array.isArray(current)) {
      current = current[token];
      return;
    }
    if (typeof token === "string" && current && typeof current === "object") {
      current = (current as Record<string, unknown>)[token];
    }
  });

  const finalToken = tokens[tokens.length - 1];
  if (typeof finalToken === "number" && Array.isArray(current)) {
    current[finalToken] = value;
  } else if (
    typeof finalToken === "string" &&
    current &&
    typeof current === "object"
  ) {
    (current as Record<string, unknown>)[finalToken] = value;
  }

  return nextPayload;
}

function tokenizePath(path: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  path.split(".").forEach((segment) => {
    let remainder = segment;
    while (remainder.length > 0) {
      const bracketIndex = remainder.indexOf("[");
      if (bracketIndex === -1) {
        tokens.push(remainder);
        return;
      }
      if (bracketIndex > 0) {
        tokens.push(remainder.slice(0, bracketIndex));
      }
      const endIndex = remainder.indexOf("]", bracketIndex);
      tokens.push(Number(remainder.slice(bracketIndex + 1, endIndex)));
      remainder = remainder.slice(endIndex + 1);
    }
  });
  return tokens;
}

function normalizeContext(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function arePayloadsEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function labelFromPath(path: string): string {
  return path
    .replaceAll(".", " ")
    .replaceAll("[", " ")
    .replaceAll("]", "")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SaveBadge({ saveState }: { saveState: SaveState }) {
  if (saveState === "idle") {
    return null;
  }

  if (saveState === "saving") {
    return (
      <Pill
        value="Saving"
        titleCase={false}
        className="bg-zinc-100 text-zinc-700"
      />
    );
  }

  if (saveState === "saved") {
    return (
      <Pill
        value="Saved"
        titleCase={false}
        className="bg-emerald-100 text-emerald-700"
      />
    );
  }

  return (
    <Pill
      value="Save error"
      titleCase={false}
      className="bg-red-100 text-red-700"
    />
  );
}

function StatusBadge({ status }: { status: FormProcessRead["status"] }) {
  const config = {
    failed: "bg-red-100 text-red-700",
    filling: "bg-amber-100 text-amber-700",
    finalized: "bg-zinc-900 text-white",
    queued: "bg-blue-100 text-blue-700",
    ready_for_review: "bg-emerald-100 text-emerald-700",
  }[status];

  return <Pill value={status} normalizeValue titleCase className={config} />;
}
