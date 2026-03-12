"use client";

import {
  Download,
  Expand,
  LoaderCircle,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { BarangayPersonnelRead } from "@/app/(workspace)/barangay-profile/_lib/types";
import type {
  GeneratedReportRead,
  ReportTemplateRead,
} from "@/app/(workspace)/reports/_lib/types";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import { PdfPreviewDialog } from "@/components/shared/pdf-preview-dialog";
import { Pill } from "@/components/shared/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type ReportsPageClientProps = {
  initialGeneratedReports: GeneratedReportRead[];
  reportTemplates: ReportTemplateRead[];
  personnelOptions: BarangayPersonnelRead[];
};

type DownloadFormat = "pdf" | "word";
type DownloadMenuState = {
  reportId: string;
  top: number;
  left: number;
};
const MONTHLY_TRANSMITTAL_TEMPLATE_KEY = "monthly_transmittal_of_final_reports";

export function ReportsPageClient({
  initialGeneratedReports,
  reportTemplates,
  personnelOptions,
}: ReportsPageClientProps) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState(
    reportTemplates[0]?.template_key ?? "",
  );
  const [periodValue, setPeriodValue] = useState(defaultMonthInputValue());
  const [reportDate, setReportDate] = useState(defaultDateInputValue());
  const [preparedBy, setPreparedBy] = useState(
    personnelOptions[0]?.full_name ?? "",
  );
  const [submittedBy, setSubmittedBy] = useState(
    personnelOptions[0]?.full_name ?? "",
  );
  const [isCreating, setIsCreating] = useState(false);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewReport, setPreviewReport] =
    useState<GeneratedReportRead | null>(null);
  const [downloadMenu, setDownloadMenu] = useState<DownloadMenuState | null>(
    null,
  );
  const [downloadingReportKey, setDownloadingReportKey] = useState<
    string | null
  >(null);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => [...initialGeneratedReports].sort(sortGeneratedReports),
    [initialGeneratedReports],
  );
  const personnelByName = useMemo(
    () =>
      new Map(
        personnelOptions.map(
          (person) => [person.full_name, person.position] as const,
        ),
      ),
    [personnelOptions],
  );
  const isMonthlyTransmittal = templateKey === MONTHLY_TRANSMITTAL_TEMPLATE_KEY;
  const submittedFieldLabel = isMonthlyTransmittal
    ? "Recipient"
    : "Submitted by";
  const submittedFieldId = isMonthlyTransmittal ? "recipient" : "submitted-by";

  useEffect(() => {
    if (!downloadMenu) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!downloadMenuRef.current) {
        return;
      }

      if (!downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenu(null);
      }
    }

    function handleViewportChange() {
      setDownloadMenu(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [downloadMenu]);

  async function handleCreateReport() {
    const parsedPeriod = parsePeriod(periodValue);
    if (!templateKey) {
      toast.error("Select a report type.");
      return;
    }
    if (!parsedPeriod) {
      toast.error("Select a valid month and year.");
      return;
    }
    if (isMonthlyTransmittal && !reportDate.trim()) {
      toast.error("Select a date.");
      return;
    }
    if (!preparedBy || !submittedBy) {
      toast.error(
        `Select both prepared by and ${isMonthlyTransmittal ? "recipient" : "submitted by"}.`,
      );
      return;
    }

    setIsCreating(true);
    try {
      const preparedPosition = personnelByName.get(preparedBy) ?? "";
      const submittedPosition = personnelByName.get(submittedBy) ?? "";
      const createResponse = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_key: templateKey,
          report_month: parsedPeriod.month,
          report_year: parsedPeriod.year,
          report_date: isMonthlyTransmittal ? reportDate : undefined,
          prepared_by: preparedBy,
          submitted_by: submittedBy,
          prepared_position: preparedPosition,
          submitted_position: submittedPosition,
        }),
      });
      const createdPayload = (await createResponse.json().catch(() => null)) as
        | GeneratedReportRead
        | { detail?: string }
        | null;
      if (!createResponse.ok || !createdPayload || !("id" in createdPayload)) {
        const detail =
          createdPayload && "detail" in createdPayload
            ? createdPayload.detail
            : "Unable to create report.";
        throw new Error(detail || "Unable to create report.");
      }

      const generateResponse = await fetch(
        `/api/reports/${encodeURIComponent(createdPayload.id)}/generate`,
        {
          method: "POST",
        },
      );
      if (!generateResponse.ok) {
        const generateError = (await generateResponse
          .json()
          .catch(() => null)) as { detail?: string } | null;
        throw new Error(generateError?.detail || "Unable to generate report.");
      }

      toast.success("Report created and generated.");
      setIsCreateDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create report.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleGenerate(reportId: string) {
    setBusyReportId(reportId);
    try {
      const response = await fetch(
        `/api/reports/${encodeURIComponent(reportId)}/generate`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        detail?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.detail || "Unable to generate report.");
      }
      toast.success("Report generated.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate report.",
      );
    } finally {
      setBusyReportId(null);
    }
  }

  async function handleDelete(reportId: string) {
    setDeletingReportId(reportId);
    try {
      const response = await fetch(
        `/api/reports/${encodeURIComponent(reportId)}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        detail?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.detail || "Unable to delete report.");
      }

      toast.success("Report deleted.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete report.",
      );
    } finally {
      setDeletingReportId(null);
    }
  }

  function openPreview(report: GeneratedReportRead) {
    setPreviewReport(report);
    setIsPreviewDialogOpen(true);
  }

  async function handleDownload(reportId: string, format: DownloadFormat) {
    const downloadKey = `${reportId}:${format}`;
    setDownloadingReportKey(downloadKey);
    setDownloadMenu(null);
    try {
      const response = await fetch(
        `/api/reports/${encodeURIComponent(reportId)}/file?format=${encodeURIComponent(format)}`,
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(payload?.detail || "Unable to download report.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const fallbackName = `report-${reportId}.${format === "pdf" ? "pdf" : "docx"}`;
      anchor.href = objectUrl;
      anchor.download =
        parseFilenameFromContentDisposition(
          response.headers.get("content-disposition"),
        ) ?? fallbackName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to download report.",
      );
    } finally {
      setDownloadingReportKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Reports
          </h1>
          <p className="text-sm text-zinc-500">
            Create monthly reports and download generated files.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="rounded-lg">
              <Plus className="size-4" />
              Create report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create report</DialogTitle>
              <DialogDescription>
                Select month, year, and report type before generation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-type">Report type</Label>
                <select
                  id="report-type"
                  className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={templateKey}
                  onChange={(event) => setTemplateKey(event.target.value)}
                >
                  {reportTemplates.map((template) => (
                    <option key={template.id} value={template.template_key}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-period">Month and year</Label>
                <Input
                  id="report-period"
                  type="month"
                  value={periodValue}
                  onChange={(event) => setPeriodValue(event.target.value)}
                />
              </div>
              {isMonthlyTransmittal ? (
                <div className="space-y-2">
                  <Label htmlFor="report-date">Date</Label>
                  <Input
                    id="report-date"
                    type="date"
                    value={reportDate}
                    onChange={(event) => setReportDate(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="prepared-by">Prepared by</Label>
                <select
                  id="prepared-by"
                  className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={preparedBy}
                  onChange={(event) => setPreparedBy(event.target.value)}
                >
                  {personnelOptions.map((person) => (
                    <option
                      key={`prepared-${person.id}`}
                      value={person.full_name}
                    >
                      {person.full_name} ({person.position})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={submittedFieldId}>{submittedFieldLabel}</Label>
                <select
                  id={submittedFieldId}
                  className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={submittedBy}
                  onChange={(event) => setSubmittedBy(event.target.value)}
                >
                  {personnelOptions.map((person) => (
                    <option
                      key={`submitted-${person.id}`}
                      value={person.full_name}
                    >
                      {person.full_name} ({person.position})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                className="w-full rounded-lg"
                onClick={handleCreateReport}
                disabled={
                  isCreating ||
                  reportTemplates.length === 0 ||
                  personnelOptions.length === 0
                }
              >
                {isCreating ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Creating report...
                  </>
                ) : (
                  "Create report"
                )}
              </Button>
              {personnelOptions.length === 0 ? (
                <p className="text-xs text-red-600">
                  Add barangay personnel first before creating reports.
                </p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-600">No reports found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200/80">
                    <TableHead className="h-12 pl-6 text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                      Report
                    </TableHead>
                    <TableHead className="h-12 text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                      Period
                    </TableHead>
                    <TableHead className="h-12 text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                      Status
                    </TableHead>
                    <TableHead className="h-12 pr-6 text-right text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((report) => {
                    const isGenerating = busyReportId === report.id;
                    const isDeleting = deletingReportId === report.id;
                    const isBusy = isGenerating || isDeleting;
                    const isDownloadingPdf =
                      downloadingReportKey === `${report.id}:pdf`;
                    const isDownloadingWord =
                      downloadingReportKey === `${report.id}:word`;
                    const isDownloadMenuOpen =
                      downloadMenu?.reportId === report.id;
                    return (
                      <TableRow
                        key={report.id}
                        className="border-zinc-200/70 align-middle transition-colors hover:bg-zinc-50/70"
                      >
                        <TableCell className="pl-6 py-4">
                          <p className="font-medium text-zinc-900">
                            {report.report_template?.name ??
                              report.report_template_id}
                          </p>
                          {report.failure_reason ? (
                            <p className="mt-1 text-xs text-red-600">
                              {report.failure_reason}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-4 text-sm text-zinc-600">
                          {formatPeriod(report)}
                        </TableCell>
                        <TableCell className="py-4">
                          <Pill
                            value={report.status}
                            normalizeValue
                            titleCase
                            variant="outline"
                            className={statusClassName(report.status)}
                          />
                        </TableCell>
                        <TableCell className="pr-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {report.status !== "ready" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-md"
                                onClick={() => handleGenerate(report.id)}
                                disabled={
                                  isBusy || report.status === "generating"
                                }
                              >
                                {isGenerating ? (
                                  <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                  <Play className="size-4" />
                                )}
                                Generate
                              </Button>
                            ) : null}
                            {report.status === "ready" ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-md"
                                  onClick={() => openPreview(report)}
                                >
                                  <Expand className="size-4" />
                                  Preview
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-md"
                                  aria-expanded={isDownloadMenuOpen}
                                  aria-haspopup="menu"
                                  disabled={
                                    isDownloadingPdf || isDownloadingWord
                                  }
                                  onClick={(event) => {
                                    if (isDownloadMenuOpen) {
                                      setDownloadMenu(null);
                                      return;
                                    }
                                    const target = event.currentTarget;
                                    const rect = target.getBoundingClientRect();
                                    setDownloadMenu({
                                      reportId: report.id,
                                      top: rect.bottom + 8,
                                      left: rect.right,
                                    });
                                  }}
                                >
                                  <Download className="size-4" />
                                  Download
                                </Button>
                              </>
                            ) : null}
                            <ConfirmationModal
                              trigger={
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-md"
                                  disabled={isBusy}
                                >
                                  {isDeleting ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-4" />
                                  )}
                                  Delete
                                </Button>
                              }
                              title="Delete report?"
                              description={`This will permanently delete "${report.report_template?.name ?? report.report_template_id}" for ${formatPeriod(report)}. This action cannot be undone.`}
                              confirmLabel="Delete report"
                              confirmVariant="destructive"
                              isConfirming={isDeleting}
                              onConfirm={() => handleDelete(report.id)}
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

      <PdfPreviewDialog
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        title={`${previewReport?.report_template?.name ?? "Report"} full screen preview`}
        description="Full screen PDF preview with page navigation and zoom controls."
        viewerTitle={`${previewReport?.report_template?.name ?? "Report"} preview`}
        src={
          previewReport
            ? `/api/reports/${encodeURIComponent(previewReport.id)}/file?format=pdf`
            : null
        }
        viewerKey={
          previewReport
            ? `report-preview-${previewReport.id}-${previewReport.updated_at}`
            : undefined
        }
      />
      {downloadMenu ? (
        <div
          ref={downloadMenuRef}
          className="fixed z-50 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg"
          style={{
            top: `${downloadMenu.top}px`,
            left: `${downloadMenu.left}px`,
            transform: "translateX(-100%)",
          }}
        >
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:text-zinc-500"
            disabled={downloadingReportKey === `${downloadMenu.reportId}:word`}
            onClick={() => {
              void handleDownload(downloadMenu.reportId, "pdf");
            }}
          >
            {downloadingReportKey === `${downloadMenu.reportId}:pdf`
              ? "Downloading PDF..."
              : "PDF"}
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:text-zinc-500"
            disabled={downloadingReportKey === `${downloadMenu.reportId}:pdf`}
            onClick={() => {
              void handleDownload(downloadMenu.reportId, "word");
            }}
          >
            {downloadingReportKey === `${downloadMenu.reportId}:word`
              ? "Downloading Word..."
              : "Word"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function defaultMonthInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function defaultDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parsePeriod(
  periodValue: string,
): { year: number; month: number } | null {
  const [yearPart, monthPart] = periodValue.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }
  if (month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

function sortGeneratedReports(
  left: GeneratedReportRead,
  right: GeneratedReportRead,
): number {
  const timeDiff =
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return left.id.localeCompare(right.id);
}

function formatPeriod(report: GeneratedReportRead): string {
  return `${new Date(
    Date.UTC(report.report_year, report.report_month - 1, 1),
  ).toLocaleString("en-US", {
    month: "long",
  })} ${report.report_year}`;
}

function statusClassName(status: GeneratedReportRead["status"]): string {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "generating") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function parseFilenameFromContentDisposition(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim());
  }

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1].trim();
  }

  return null;
}
