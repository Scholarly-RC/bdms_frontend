"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-10 w-full gap-2 rounded-lg"
      type="submit"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Signing in...
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}
