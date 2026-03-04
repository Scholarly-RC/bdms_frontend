import type { PdfFieldParseResult } from "@/app/(workspace)/forms/_lib/types";

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type ProcessJobRead = {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type FormProcessFormRead = {
  id: string;
  form_process_id: string;
  source_form_id: string;
  name: string;
  description: string;
  storage_bucket: string;
  storage_object_path: string;
  extracted_fields_json: PdfFieldParseResult | null;
  extracted_fields_count: number;
  extracted_fields_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FormProcessRead = {
  id: string;
  title: string;
  context: string;
  status:
    | "queued"
    | "filling"
    | "ready_for_review"
    | "failed"
    | "finalized";
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  failure_reason: string | null;
  current_job_id: string | null;
  current_job: ProcessJobRead | null;
  forms: FormProcessFormRead[];
};
