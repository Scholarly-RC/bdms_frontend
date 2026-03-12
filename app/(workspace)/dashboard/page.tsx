import {
  CheckCircle2,
  ClipboardList,
  FileStack,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { FormProcessRead } from "@/app/(workspace)/form-processes/_lib/types";
import type { FormRead } from "@/app/(workspace)/forms/_lib/types";
import { Pill } from "@/components/shared/pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { backendFetchFromSession } from "@/lib/api/server";

async function fetchForms(): Promise<FormRead[]> {
  const response = await backendFetchFromSession("/forms", { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to load forms.");
  }

  return (await response.json()) as FormRead[];
}

async function fetchFormProcesses(): Promise<FormProcessRead[]> {
  const response = await backendFetchFromSession("/processes", {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Unable to load form processes.");
  }

  return (await response.json()) as FormProcessRead[];
}

export default async function DashboardPage() {
  const [forms, processes] = await Promise.all([
    fetchForms(),
    fetchFormProcesses(),
  ]);

  const activeForms = forms.filter((form) => form.is_active).length;
  const totalProcessForms = processes.reduce(
    (count, process) => count + process.forms.length,
    0,
  );
  const reviewCount = processes.filter(
    (process) => process.status === "ready_for_review",
  ).length;
  const inProgressCount = processes.filter(
    (process) => process.status === "queued" || process.status === "filling",
  ).length;
  const finalizedCount = processes.filter(
    (process) => process.status === "finalized",
  ).length;
  const failedCount = processes.filter(
    (process) => process.status === "failed",
  ).length;

  const latestProcesses = [...processes]
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime(),
    )
    .slice(0, 5);

  const processStatusRows: Array<{
    label: string;
    count: number;
    tone: string;
  }> = [
    {
      label: "Queued or filling",
      count: inProgressCount,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "Ready for review",
      count: reviewCount,
      tone: "border-sky-200 bg-sky-50 text-sky-700",
    },
    {
      label: "Finalized",
      count: finalizedCount,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Failed",
      count: failedCount,
      tone: "border-red-200 bg-red-50 text-red-700",
    },
  ];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            Live intake, process, and review counts from the current workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/forms">Manage forms</Link>
          </Button>
          <Button asChild className="rounded-lg">
            <Link href="/form-processes/new">Create process</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Form templates"
          value={forms.length}
          detail={`${activeForms} active template${activeForms === 1 ? "" : "s"}`}
          icon={<FileStack className="size-5" />}
        />
        <StatCard
          title="Forms copied into processes"
          value={totalProcessForms}
          detail={`${processes.length} total process run${processes.length === 1 ? "" : "s"}`}
          icon={<ClipboardList className="size-5" />}
        />
        <StatCard
          title="Needs review"
          value={reviewCount}
          detail="Processes waiting for manual review"
          icon={<LoaderCircle className="size-5" />}
        />
        <StatCard
          title="Finalized"
          value={finalizedCount}
          detail={
            failedCount > 0
              ? `${failedCount} failed process${failedCount === 1 ? "" : "es"} need attention`
              : "No failed processes right now"
          }
          icon={<CheckCircle2 className="size-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Process status</CardTitle>
            <CardDescription>
              Keep only the status buckets that affect operator follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {processStatusRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {row.label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {row.count === 0
                      ? "Nothing pending in this bucket"
                      : "Currently active in workspace"}
                  </p>
                </div>
                <Pill
                  value={String(row.count)}
                  normalizeValue={false}
                  titleCase={false}
                  variant="outline"
                  className={row.tone}
                />
              </div>
            ))}

            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-900">
                <TriangleAlert className="size-4 text-amber-600" />
                Template availability
              </div>
              <p className="text-sm text-zinc-600">
                {activeForms} of {forms.length} form template
                {forms.length === 1 ? "" : "s"} are active and available for
                process creation.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Latest process activity</CardTitle>
            <CardDescription>
              Most recently updated processes and the amount of review material
              attached.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestProcesses.length === 0 ? (
              <p className="text-sm text-zinc-600">No processes found.</p>
            ) : (
              latestProcesses.map((process) => (
                <div
                  key={process.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-zinc-900">
                        {process.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Updated {formatDateTime(process.updated_at)}
                      </p>
                    </div>
                    <ProcessStatusPill status={process.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    <span>
                      {process.forms.length} attached form
                      {process.forms.length === 1 ? "" : "s"}
                    </span>
                    {process.current_job ? (
                      <span>
                        Current job:{" "}
                        {formatJobStatus(process.current_job.status)} at{" "}
                        {process.current_job.progress}%
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-zinc-300/70 bg-white/82 py-4 backdrop-blur-sm">
      <CardContent className="space-y-2 px-4">
        <div className="flex items-center justify-between gap-3 text-zinc-500">
          <p className="text-sm">{title}</p>
          {icon}
        </div>
        <p className="text-3xl font-semibold text-zinc-950">{value}</p>
        <p className="text-xs text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ProcessStatusPill({ status }: { status: FormProcessRead["status"] }) {
  const className =
    status === "finalized"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "ready_for_review"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "failed"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Pill
      value={status}
      normalizeValue
      titleCase
      variant="outline"
      className={className}
    />
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatJobStatus(
  status: NonNullable<FormProcessRead["current_job"]>["status"],
): string {
  return status.replaceAll("_", " ");
}
