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
  payload_json: Record<string, unknown> | null;
  payload_field_order: string[] | null;
  payload_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FormProcessRead = {
  id: string;
  title: string;
  context: string;
  case_id: string | null;
  complainants: string[];
  respondents: string[];
  nature_of_case: "criminal" | "civil" | "others" | null;
  action_taken:
    | "mediation"
    | "conciliation"
    | "arbitration"
    | "repudiation"
    | "dismissed"
    | "certified_case"
    | "pending"
    | null;
  status: "queued" | "filling" | "ready_for_review" | "failed" | "finalized";
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  failure_reason: string | null;
  current_job_id: string | null;
  current_job: ProcessJobRead | null;
  forms: FormProcessFormRead[];
};
