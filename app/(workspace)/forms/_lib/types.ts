export type PdfFieldCandidate = {
  page: number;
  kind: string;
  name?: string;
  label?: string;
  line_text: string;
  match_text: string;
  value: string;
  rule?: string;
  bbox: [number, number, number, number];
  anchor_before: string;
  anchor_after: string;
  source: string;
  span_index: number;
};

export type PdfFieldParseResult = {
  pdf_path: string;
  total_candidates: number;
  candidates: PdfFieldCandidate[];
};

export type FormRead = {
  id: string;
  name: string;
  description: string;
  storage_bucket: string;
  storage_object_path: string;
  is_active: boolean;
  extracted_fields_json: PdfFieldParseResult | null;
  extracted_fields_count: number;
  extracted_fields_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SaveState = "idle" | "saving" | "saved" | "error";
