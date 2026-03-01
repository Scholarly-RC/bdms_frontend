"use server";

import { redirect } from "next/navigation";

import { backendFetchFromSession } from "@/lib/api/server";
import { barangayProfileFormSchema } from "@/lib/validation/form-actions";

function getErrorMessage(status: number, detail?: string): string {
  if (detail) {
    return detail;
  }
  if (status === 401) {
    return "Session expired. Please sign in again.";
  }
  if (status === 403) {
    return "Admin role required to update barangay profile.";
  }
  return "Unable to save barangay profile.";
}

export async function updateBarangayProfileAction(
  formData: FormData,
): Promise<void> {
  const parsed = barangayProfileFormSchema.safeParse({
    province: formData.get("province"),
    municipality: formData.get("municipality"),
    barangay: formData.get("barangay"),
  });

  if (!parsed.success) {
    redirect("/barangay-profile?error=All%20fields%20are%20required.");
  }

  const { province, municipality, barangay } = parsed.data;

  const response = await backendFetchFromSession("/barangay-profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      province,
      municipality,
      barangay,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const message = getErrorMessage(response.status, payload?.detail);
    redirect(`/barangay-profile?error=${encodeURIComponent(message)}`);
  }

  redirect(
    "/barangay-profile?success=Barangay%20profile%20saved%20successfully.",
  );
}
