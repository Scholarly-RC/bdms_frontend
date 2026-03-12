import { FormsPageClient } from "@/app/(workspace)/forms/_components/forms-page-client";
import type { FormRead } from "@/app/(workspace)/forms/_lib/types";
import { backendFetchFromSession } from "@/lib/api/server";

const formNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

async function fetchForms(): Promise<FormRead[]> {
  const response = await backendFetchFromSession("/forms", { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to load forms.");
  }

  const payload = (await response.json()) as FormRead[];
  return payload.sort((left, right) =>
    formNameCollator.compare(left.name, right.name),
  );
}

export default async function FormsPage() {
  const forms = await fetchForms();

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Forms
          </h1>
          <p className="text-sm text-zinc-500">
            Existing forms from backend API.
          </p>
        </div>
      </header>
      <FormsPageClient forms={forms} />
    </div>
  );
}
