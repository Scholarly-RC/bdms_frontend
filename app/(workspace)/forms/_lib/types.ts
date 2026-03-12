export type FormRead = {
  id: string;
  name: string;
  description: string;
  storage_bucket: string;
  storage_object_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SaveState = "idle" | "saving" | "saved" | "error";
