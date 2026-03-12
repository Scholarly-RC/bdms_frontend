import type { BarangayPersonnelRead } from "@/app/(workspace)/barangay-profile/_lib/types";
import { ReportsPageClient } from "@/app/(workspace)/reports/_components/reports-page-client";
import type {
  GeneratedReportRead,
  ReportTemplateRead,
} from "@/app/(workspace)/reports/_lib/types";
import { backendFetchFromSession } from "@/lib/api/server";

async function fetchReportTemplates(): Promise<ReportTemplateRead[]> {
  const response = await backendFetchFromSession("/reports/templates", {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Unable to load report templates.");
  }
  return (await response.json()) as ReportTemplateRead[];
}

async function fetchGeneratedReports(): Promise<GeneratedReportRead[]> {
  const response = await backendFetchFromSession("/reports", {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Unable to load generated reports.");
  }
  return (await response.json()) as GeneratedReportRead[];
}

async function fetchBarangayPersonnel(): Promise<BarangayPersonnelRead[]> {
  const response = await backendFetchFromSession(
    "/barangay-profile/personnel",
    {
      method: "GET",
    },
  );
  if (!response.ok) {
    return [];
  }
  return (await response.json()) as BarangayPersonnelRead[];
}

export default async function ReportsPage() {
  const [reportTemplates, generatedReports, personnel] = await Promise.all([
    fetchReportTemplates(),
    fetchGeneratedReports(),
    fetchBarangayPersonnel(),
  ]);

  return (
    <ReportsPageClient
      reportTemplates={reportTemplates}
      initialGeneratedReports={generatedReports}
      personnelOptions={personnel}
    />
  );
}
