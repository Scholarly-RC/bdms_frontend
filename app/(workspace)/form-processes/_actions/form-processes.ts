"use server";

import { redirect } from "next/navigation";

import { backendFetchFromSession } from "@/lib/api/server";
import {
  createFormProcessFormSchema,
  deleteFormProcessSchema,
} from "@/lib/validation/form-actions";

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
    title: formData.get("title"),
    caseId: formData.get("case_id"),
    formIds: formData
      .getAll("form_ids")
      .map((value) => (typeof value === "string" ? value : ""))
      .filter((value) => value.length > 0),
    context: formData.get("context"),
  });

  if (!parsed.success) {
    redirect(
      "/form-processes?error=Please%20fill%20in%20all%20required%20fields.",
    );
  }

  const { caseId, formIds, context, title } = parsed.data;

  const response = await backendFetchFromSession("/processes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      case_id: caseId || null,
      form_ids: formIds,
      context,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const message = getErrorMessage(response.status, payload?.detail);
    redirect(`/form-processes?error=${encodeURIComponent(message)}`);
  }

  const createdProcesses = (await response.json().catch(() => [])) as {
    id: string;
  }[];
  const processCount = createdProcesses.length || 1;
  const formCount = formIds.length;
  const successMessage =
    processCount === 1
      ? `1 form process created with ${formCount} selected form${formCount === 1 ? "" : "s"} and queued for AI filling.`
      : `${processCount} form processes created and queued for AI filling.`;

  redirect(`/form-processes?success=${encodeURIComponent(successMessage)}`);
}

function getDeleteErrorMessage(status: number, detail?: string): string {
  if (detail) {
    return detail;
  }
  if (status === 401) {
    return "Session expired. Please sign in again.";
  }
  if (status === 404) {
    return "Form process not found.";
  }
  return "Unable to delete form process.";
}

export async function deleteFormProcessAction(
  processId: string,
): Promise<void> {
  const parsed = deleteFormProcessSchema.safeParse({ processId });
  if (!parsed.success) {
    redirect("/form-processes?error=Invalid%20form%20process%20id.");
  }

  const response = await backendFetchFromSession(
    `/processes/${parsed.data.processId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const message = getDeleteErrorMessage(response.status, payload?.detail);
    redirect(`/form-processes?error=${encodeURIComponent(message)}`);
  }

  redirect("/form-processes?success=Form%20process%20deleted%20successfully.");
}
