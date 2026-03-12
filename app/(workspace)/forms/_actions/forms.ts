"use server";

import { redirect } from "next/navigation";

import { backendFetchFromSession } from "@/lib/api/server";
import {
  createFormFormSchema,
  updateFormStatusSchema,
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

function getUpdateStatusErrorMessage(status: number, detail?: string): string {
  if (detail) {
    return detail;
  }
  if (status === 401) {
    return "Session expired. Please sign in again.";
  }
  if (status === 403) {
    return "Admin role required to update a form.";
  }
  if (status === 404) {
    return "Form not found.";
  }
  return "Unable to update form.";
}

export async function updateFormStatusAction(
  formId: string,
  isActive: boolean,
): Promise<void> {
  const parsed = updateFormStatusSchema.safeParse({ formId, isActive });
  if (!parsed.success) {
    redirect("/forms?error=Invalid%20form%20id.");
  }

  const response = await backendFetchFromSession(
    `/forms/${parsed.data.formId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: parsed.data.isActive }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const message = getUpdateStatusErrorMessage(
      response.status,
      payload?.detail,
    );
    redirect(`/forms?error=${encodeURIComponent(message)}`);
  }

  const message = parsed.data.isActive
    ? "Form%20enabled%20successfully."
    : "Form%20disabled%20successfully.";
  redirect(`/forms?success=${message}`);
}
