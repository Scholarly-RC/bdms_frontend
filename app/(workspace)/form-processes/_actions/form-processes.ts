"use server";

import { redirect } from "next/navigation";

import { backendFetchFromSession } from "@/lib/api/server";
import { createFormProcessFormSchema } from "@/lib/validation/form-actions";

function getErrorMessage(status: number, detail?: string): string {
  if (detail) {
    return detail;
  }
  if (status === 401) {
    return "Session expired. Please sign in again.";
  }
  return "Unable to create form process.";
}

export async function createFormProcessAction(
  formData: FormData,
): Promise<void> {
  const parsed = createFormProcessFormSchema.safeParse({
    formId: formData.get("form_id"),
    context: formData.get("context"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(
      "/form-processes?error=Please%20fill%20in%20all%20required%20fields.",
    );
  }

  const { formId, context, status } = parsed.data;

  const response = await backendFetchFromSession(`/forms/${formId}/processes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context,
      status,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const message = getErrorMessage(response.status, payload?.detail);
    redirect(`/form-processes?error=${encodeURIComponent(message)}`);
  }

  redirect("/form-processes?success=Form%20process%20created%20successfully.");
}
