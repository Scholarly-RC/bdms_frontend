"use client";

import { Eye, LoaderCircle, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DeleteFormProcessButton } from "@/app/(workspace)/form-processes/_components/delete-form-process-button";
import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { formatPillValue, Pill } from "@/components/shared/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FormProcessesTableProps = {
  processes: FormProcessRead[];
  emptyMessage?: string;
  hasPollableProcess?: boolean;
};

const POLLABLE_STATUSES = new Set<FormProcessRead["status"]>([
  "queued",
  "filling",
]);

type TimestampOverride = {
  created_at: string;
  updated_at: string;
};

export function FormProcessesTable({
  processes,
  emptyMessage = "No form processes found.",
  hasPollableProcess,
}: FormProcessesTableProps) {
  const router = useRouter();
  const [timestampOverrides, setTimestampOverrides] = useState<
    Record<string, TimestampOverride>
  >({});
  const shouldPoll =
    hasPollableProcess ??
    processes.some((process) => POLLABLE_STATUSES.has(process.status));

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router, shouldPoll]);

  useEffect(() => {
    setTimestampOverrides((current) => {
      const validIds = new Set(processes.map((process) => process.id));
      const next = Object.fromEntries(
        Object.entries(current).filter(([id]) => validIds.has(id)),
      );

      return Object.keys(next).length === Object.keys(current).length
        ? current
        : next;
    });
  }, [processes]);

  return (
    <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
      <CardContent className="p-0">
        {processes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-600">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200/80">
                  <TableHead className="h-12 w-[40%] pl-6 text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                    Process
                  </TableHead>
                  <TableHead className="h-12 w-[28%] text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                    Status
                  </TableHead>
                  <TableHead className="h-12 w-[20%] text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                    Updated
                  </TableHead>
                  <TableHead className="h-12 w-[12%] pr-6 text-right text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process) => {
                  const dateValues = timestampOverrides[process.id] ?? {
                    created_at: process.created_at,
                    updated_at: process.updated_at,
                  };

                  return (
                    <TableRow
                      key={process.id}
                      className="border-zinc-200/70 align-middle transition-colors hover:bg-zinc-50/70"
                    >
                      <TableCell className="pl-6 py-4 align-middle">
                        <p className="font-medium text-zinc-900">
                          {process.title}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 align-middle">
                        <div className="space-y-2">
                          <StatusBadge process={process} />
                          {process.failure_reason ? (
                            <p className="max-w-xs text-xs text-red-600">
                              {process.failure_reason}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 align-middle text-sm text-zinc-500">
                        <div className="space-y-1 leading-tight">
                          <p className="font-medium text-zinc-700">
                            {formatProcessDate(dateValues.updated_at)}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Created {formatShortDate(dateValues.created_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 py-4 align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <ProcessTimestampsDialog
                            process={process}
                            values={dateValues}
                            onSave={async (nextValues) => {
                              const response = await fetch(
                                `/api/processes/${encodeURIComponent(process.id)}`,
                                {
                                  body: JSON.stringify(nextValues),
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  method: "PATCH",
                                },
                              );
                              const payload = (await response
                                .json()
                                .catch(() => null)) as
                                | {
                                    created_at?: string;
                                    updated_at?: string;
                                  }
                                | null;

                              if (!response.ok) {
                                throw new Error("Unable to save date-time values.");
                              }

                              setTimestampOverrides((current) => ({
                                ...current,
                                [process.id]: {
                                  created_at:
                                    payload?.created_at ?? nextValues.created_at,
                                  updated_at:
                                    payload?.updated_at ?? nextValues.updated_at,
                                },
                              }));
                              router.refresh();
                            }}
                          />
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="size-8 rounded-md p-0"
                          >
                            <Link
                              href={`/form-processes/${encodeURIComponent(process.id)}`}
                              aria-label={
                                process.status === "finalized"
                                  ? "View process"
                                  : "Review process"
                              }
                              title={
                                process.status === "finalized"
                                  ? "View process"
                                  : "Review process"
                              }
                            >
                              <Eye className="size-4" />
                              <span className="sr-only">
                                {process.status === "finalized"
                                  ? "View"
                                  : "Review"}
                              </span>
                            </Link>
                          </Button>
                          <DeleteFormProcessButton
                            processId={process.id}
                            processName={formatProcessName(process)}
                            iconOnly
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProcessTimestampsDialog({
  process,
  values,
  onSave,
}: {
  process: FormProcessRead;
  values: TimestampOverride;
  onSave: (values: TimestampOverride) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdAtInput, setCreatedAtInput] = useState(
    toLocalDateTimeInput(values.created_at),
  );
  const [updatedAtInput, setUpdatedAtInput] = useState(
    toLocalDateTimeInput(values.updated_at),
  );

  useEffect(() => {
    if (!open) {
      setCreatedAtInput(toLocalDateTimeInput(values.created_at));
      setUpdatedAtInput(toLocalDateTimeInput(values.updated_at));
      setErrorMessage("");
      setIsSaving(false);
    }
  }, [open, values.created_at, values.updated_at]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="size-8 rounded-md p-0"
          aria-label="Customize dates"
          title="Customize dates"
        >
          <Settings className="size-4" />
          <span className="sr-only">Customize dates</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Dates</DialogTitle>
          <DialogDescription>
            Update the saved created and updated date-time values for this process.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor={`created-at-${process.id}`}>Created date-time</Label>
            <Input
              id={`created-at-${process.id}`}
              type="datetime-local"
              value={createdAtInput}
              onChange={(event) => setCreatedAtInput(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`updated-at-${process.id}`}>Updated date-time</Label>
            <Input
              id={`updated-at-${process.id}`}
              type="datetime-local"
              value={updatedAtInput}
              onChange={(event) => setUpdatedAtInput(event.target.value)}
            />
          </div>
        </div>
        {errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              setErrorMessage("");
              try {
                await onSave({
                  created_at: fromLocalDateTimeInput(
                    createdAtInput,
                    values.created_at,
                  ),
                  updated_at: fromLocalDateTimeInput(
                    updatedAtInput,
                    values.updated_at,
                  ),
                });
                setOpen(false);
              } catch {
                setErrorMessage("Unable to save date-time values.");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isSaving ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ process }: { process: FormProcessRead }) {
  const { status, current_job: currentJob } = process;
  const styles =
    status === "finalized"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "ready_for_review"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "failed"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  const normalizedStatus = formatPillValue(status, {
    normalizeValue: true,
    titleCase: true,
  });
  const shouldShowFillingProgress =
    status === "filling" &&
    typeof currentJob?.progress === "number" &&
    currentJob.progress < 100;
  const label = shouldShowFillingProgress
    ? `${normalizedStatus} ${currentJob.progress}%`
    : normalizedStatus;

  return (
    <Pill
      value={label}
      normalizeValue={false}
      titleCase={false}
      variant="outline"
      className={styles}
    />
  );
}

function formatProcessDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function fromLocalDateTimeInput(value: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function formatProcessName(process: FormProcessRead): string {
  return `"${process.title}"`;
}
