"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DeleteFormProcessButton } from "@/app/(workspace)/form-processes/_components/delete-form-process-button";
import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FormRead = {
  id: string;
  name: string;
};

type FormProcessesTableProps = {
  forms: FormRead[];
  processes: FormProcessRead[];
};

const POLLABLE_STATUSES = new Set<FormProcessRead["status"]>(["queued", "filling"]);

export function FormProcessesTable({
  forms,
  processes,
}: FormProcessesTableProps) {
  const router = useRouter();

  useEffect(() => {
    if (!processes.some((process) => POLLABLE_STATUSES.has(process.status))) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [processes, router]);

  const formNames = new Map(forms.map((form) => [form.id, form.name]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Forms</TableHead>
          <TableHead>Context</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="pr-6 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {processes.map((process) => (
          <TableRow key={process.id}>
            <TableCell className="pl-6">
              <div className="space-y-1">
                {process.forms.map((form) => (
                  <p key={form.id} className="font-medium text-zinc-900">
                    {form.name || formNames.get(form.source_form_id) || "Unknown form"}
                  </p>
                ))}
              </div>
            </TableCell>
            <TableCell className="max-w-md text-sm text-zinc-600">
              <p className="line-clamp-3">{process.context}</p>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="rounded-full bg-zinc-100 text-zinc-700">
                {process.status === "ready_for_review"
                  ? "Ready for review"
                  : process.status.replaceAll("_", " ")}
              </Badge>
              {process.current_job ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Job {formatJobStatus(process.current_job.status)} · {process.current_job.progress}%
                </p>
              ) : null}
              {process.failure_reason ? (
                <p className="mt-1 max-w-xs text-xs text-red-600">
                  {process.failure_reason}
                </p>
              ) : null}
            </TableCell>
            <TableCell className="text-sm text-zinc-500">
              {formatProcessDate(process.created_at)}
            </TableCell>
            <TableCell className="pr-6 text-right">
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-md">
                  <Link href={`/form-processes/${encodeURIComponent(process.id)}`}>
                    {process.status === "finalized" ? "View" : "Review"}
                  </Link>
                </Button>
                <DeleteFormProcessButton
                  processId={process.id}
                  processName={formatProcessName(process)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatProcessDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatJobStatus(status: FormProcessRead["current_job"] extends infer T
  ? T extends { status: infer S }
    ? S
    : never
  : never): string {
  return typeof status === "string" ? status.replaceAll("_", " ") : "";
}

function formatProcessName(process: FormProcessRead): string {
  const names = process.forms.map((form) => form.name).filter((name) => name.length > 0);
  if (names.length === 0) {
    return `this process from ${formatProcessDate(process.created_at)}`;
  }
  return `"${names.join(", ")}"`;
}
