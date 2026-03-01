"use server";

import { redirect } from "next/navigation";

import { backendFetchFromSession } from "@/lib/api/server";
import {
  createFormFormSchema,
  deleteFormSchema,
} from "@/lib/validation/form-actions";

function getErrorMessage(status: number, detail?: string): string {
  if (detail) {
    return detail;
  }
  if (status === 401) {
    return "Session expired. Please sign in again.";
  }
  if (status === 403) {
    return "Admin role required to create a form.";
  }
  return "Unable to create form.";
}

export async function createFormAction(formData: FormData): Promise<void> {
  const parsed = createFormFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    file: formData.get("file"),
  });

  if (!parsed.success) {
    redirect("/forms?error=Please%20fill%20in%20all%20required%20fields.");
  }

  const { name, description, file } = parsed.data;

  const payload = new FormData();
  payload.append("name", name);
  payload.append("description", description);
  payload.append("file", file);

  const response = await backendFetchFromSession("/forms", {
    method: "POST",
    body: payload,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const message = getErrorMessage(response.status, payload?.detail);
    redirect(`/forms?error=${encodeURIComponent(message)}`);
  }

  redirect("/forms?success=Form%20created%20successfully.");
}

function getDeleteErrorMessage(status: number, detail?: string): string {
  if (detail) {
    return detail;
  }
  if (status === 401) {
    return "Session expired. Please sign in again.";
  }
  if (status === 403) {
    return "Admin role required to delete a form.";
  }
  if (status === 404) {
    return "Form not found.";
  }
  if (status === 409) {
    return "Form is referenced by existing records and cannot be deleted.";
  }
  return "Unable to delete form.";
}

export async function deleteFormAction(formId: string): Promise<void> {
  const parsed = deleteFormSchema.safeParse({ formId });
  if (!parsed.success) {
    redirect("/forms?error=Invalid%20form%20id.");
  }

  const response = await backendFetchFromSession(
    `/forms/${parsed.data.formId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const message = getDeleteErrorMessage(response.status, payload?.detail);
    redirect(`/forms?error=${encodeURIComponent(message)}`);
  }

  redirect("/forms?success=Form%20deleted%20successfully.");
}
