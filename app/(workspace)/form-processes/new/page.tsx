import Link from "next/link";

import { CreateFormProcessForm } from "@/app/(workspace)/form-processes/_components/create-form-process-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { backendFetchFromSession } from "@/lib/api/server";

type FormRead = {
  id: string;
  name: string;
  description: string;
};

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

export default async function NewFormProcessPage() {
  const forms = await fetchForms();

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Create Form Process
          </h1>
          <p className="text-sm text-zinc-500">
            Create one AI-filled process from one or more selected master forms.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-lg">
          <Link href="/form-processes">Back to processes</Link>
        </Button>
      </header>
      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-950">
            Process Details
          </h2>
          <p className="text-sm text-zinc-500">
            Selected master forms will be copied into one process and queued for
            AI filling.
          </p>
        </CardHeader>
        <CardContent>
          <CreateFormProcessForm forms={forms} />
        </CardContent>
      </Card>
    </div>
  );
}
