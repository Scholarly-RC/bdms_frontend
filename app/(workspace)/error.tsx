"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const hasToastedRef = useRef(false);

  useEffect(() => {
    if (hasToastedRef.current) {
      return;
    }

    hasToastedRef.current = true;
    toast.error(error.message || "Unexpected workspace error.");
  }, [error.message]);

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-3xl justify-center">
        <Button onClick={reset} variant="outline" type="button">
          Try again
        </Button>
      </div>
    </main>
  );
}
