"use client";

import {
  CheckCircle2,
  Download,
  Expand,
  FileText,
  LoaderCircle,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  FormProcessFormRead,
  FormProcessRead,
} from "@/app/(workspace)/form-processes/_lib/types";
import { PdfPreviewViewer } from "@/app/(workspace)/form-processes/[processId]/_components/pdf-preview-viewer";
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
  const initialPayload = useMemo(
    () => normalizePayload(processForm.payload_json),
    [processForm.payload_json],
  );
  const [payloadJson, setPayloadJson] =
    useState<Record<string, unknown>>(initialPayload);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isUpdatingProcessStatus, setIsUpdatingProcessStatus] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);
  const isEditable = process.status === "ready_for_review";
  const isFinalized = process.status === "finalized";
  const finalizedPdfFileUrl = `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/file?format=pdf`;
  const finalizedWordFileUrl = `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/file?format=word`;
  const previewFileUrl = `/api/processes/${encodeURIComponent(process.id)}/forms/${encodeURIComponent(processForm.id)}/preview-file?v=${previewVersion}`;
  const fields = useMemo(
    () => flattenPayloadFields(payloadJson),
    [payloadJson],
  );

  useEffect(() => {
    setPayloadJson(initialPayload);
  }, [initialPayload]);

  useEffect(() => {
    setIsPreviewLoading(true);
  }, []);

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
  }

  const { run: queuePayloadSave } = useDebouncedCallback<
    Record<string, unknown>
  >((nextPayload) => {
    void persistPayload(nextPayload).catch(() => {
      setSaveState("error");
    });
  }, 350);

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

  function handleFieldChange(path: string, value: string) {
    const nextPayload = setPayloadValue(payloadJson, path, value);
    setPayloadJson(nextPayload);
    queuePayloadSave(nextPayload);
    setIsPreviewLoading(true);
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
            {process.current_job ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                Job progress: {process.current_job.progress}% ·{" "}
                {process.current_job.status.replaceAll("_", " ")}
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
                {POLLABLE_STATUSES.has(process.status) ? (
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
              {isPreviewLoading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/88 backdrop-blur-sm">
                  <LoaderCircle className="size-8 animate-spin text-zinc-500" />
                  <p className="text-sm text-zinc-600">
                    Rendering PDF preview...
                  </p>
                </div>
              ) : null}
              <PdfPreviewViewer
                key={previewFileUrl}
                title={`${processForm.name} preview`}
                src={previewFileUrl}
                onLoadingStateChange={setIsPreviewLoading}
                showZoomControls={false}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="self-start border-zinc-300/70 bg-white/85 backdrop-blur-sm lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>
              {isFinalized ? "Finalized Payload" : "Payload Fields"}
            </CardTitle>
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
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {field.label}
                    </p>
                    <p className="text-xs tracking-wide text-zinc-500">
                      {field.path}
                    </p>
                  </div>
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
              onClick={() => setIsContextDialogOpen(false)}
            >
              Close
            </Button>
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
