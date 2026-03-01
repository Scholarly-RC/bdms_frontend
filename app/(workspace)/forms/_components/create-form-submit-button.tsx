"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type CreateFormSubmitButtonProps = {
  canSubmit: boolean;
};

export function CreateFormSubmitButton({
  canSubmit,
}: CreateFormSubmitButtonProps) {
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
          Creating form...
        </>
      ) : (
        "Create form"
      )}
    </Button>
  );
}
