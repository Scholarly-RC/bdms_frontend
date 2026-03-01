import { CreateFormProcessDialog } from "@/app/(workspace)/form-processes/_components/create-form-process-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { backendFetchFromSession } from "@/lib/api/server";

type FormRead = {
  id: string;
  name: string;
};

type FormProcessRead = {
  id: string;
  form_id: string;
  context: string;
  status: string;
  created_at: string;
};

async function fetchForms(): Promise<FormRead[]> {
  const response = await backendFetchFromSession("/forms", { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to load forms.");
  }

  const payload = (await response.json()) as FormRead[];
  return payload;
}

async function fetchFormProcesses(): Promise<FormProcessRead[]> {
  const response = await backendFetchFromSession("/processes", {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Unable to load form processes.");
  }

  const payload = (await response.json()) as FormProcessRead[];
  return payload;
}

export default async function FormProcessesPage() {
  const [forms, processes] = await Promise.all([
    fetchForms(),
    fetchFormProcesses(),
  ]);
  const formNames = new Map(forms.map((form) => [form.id, form.name]));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Form Processes
          </h1>
          <p className="text-sm text-zinc-500">
            Active and historical process records from backend API.
          </p>
        </div>
        <CreateFormProcessDialog forms={forms} />
      </header>
      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardContent className="space-y-3">
          {processes.length === 0 ? (
            <p className="pt-6 text-sm text-zinc-600">
              No form processes found.
            </p>
          ) : (
            processes.map((process) => (
              <div
                key={process.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
              >
                <p className="font-medium text-zinc-900">
                  {formNames.get(process.form_id) ?? "Unknown form"}
                </p>
                <p className="text-sm text-zinc-600">{process.context}</p>
                <p className="text-xs text-zinc-500">
                  Status: {process.status}
                </p>
                <p className="text-xs text-zinc-500">
                  Process ID: {process.id}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
