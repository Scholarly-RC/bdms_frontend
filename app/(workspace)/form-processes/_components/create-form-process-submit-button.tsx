"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type CreateFormProcessSubmitButtonProps = {
  canSubmit: boolean;
};

export function CreateFormProcessSubmitButton({
  canSubmit,
}: CreateFormProcessSubmitButtonProps) {
  const { pending } = useFormStatus();
  const disabled = pending || !canSubmit;

  return (
    <Button
      className="h-10 w-full gap-2 rounded-lg"
      type="submit"
      disabled={disabled}
      aria-disabled={disabled}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Creating processes...
        </>
      ) : (
        "Create processes"
      )}
    </Button>
  );
}
