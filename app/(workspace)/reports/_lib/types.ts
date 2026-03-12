export type ReportTemplateRead = {
  id: string;
  template_key: string;
  name: string;
  description: string;
  template_category: string;
  storage_bucket: string;
  storage_object_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GeneratedReportStatus = "draft" | "generating" | "ready" | "failed";

export type GeneratedReportRead = {
  id: string;
  report_template_id: string;
  report_month: number;
  report_year: number;
  status: GeneratedReportStatus;
  payload_json: Record<string, unknown>;
  output_storage_bucket: string | null;
  output_docx_object_path: string | null;
  output_pdf_object_path: string | null;
  failure_reason: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  report_template: ReportTemplateRead | null;
};
