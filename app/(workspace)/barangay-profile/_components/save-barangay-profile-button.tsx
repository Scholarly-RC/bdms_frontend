"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SaveBarangayProfileButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-10 gap-2 rounded-lg"
      type="submit"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Saving...
        </>
      ) : (
        "Save profile"
      )}
    </Button>
  );
}
