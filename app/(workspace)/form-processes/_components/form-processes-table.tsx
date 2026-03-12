"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { DeleteFormProcessButton } from "@/app/(workspace)/form-processes/_components/delete-form-process-button";
import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { formatPillValue, Pill } from "@/components/shared/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function FormProcessesTable({
  processes,
  emptyMessage = "No form processes found.",
  hasPollableProcess,
}: FormProcessesTableProps) {
  const router = useRouter();
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
                {processes.map((process) => (
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
                          {formatProcessDate(process.updated_at)}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Created {formatShortDate(process.created_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 py-4 align-middle">
                      <div className="flex items-center justify-end gap-2">
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
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

function formatProcessName(process: FormProcessRead): string {
  return `"${process.title}"`;
}
