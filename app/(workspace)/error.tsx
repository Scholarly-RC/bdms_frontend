"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="size-5" /> Workspace error
            </CardTitle>
            <CardDescription>
              Something went wrong while loading this section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600">
              {error.message || "Unexpected workspace error."}
            </p>
            <Button onClick={reset}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
