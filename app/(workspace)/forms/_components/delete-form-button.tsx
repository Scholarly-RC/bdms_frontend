"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteFormAction } from "@/app/(workspace)/forms/_actions/forms";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import { Button } from "@/components/ui/button";

type DeleteFormButtonProps = {
  formId: string;
  formName: string;
};

export function DeleteFormButton({ formId, formName }: DeleteFormButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(() => {
      void deleteFormAction(formId);
    });
  };

  return (
    <ConfirmationModal
      trigger={
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      }
      title="Delete form?"
      description={`This will permanently remove "${formName}". This action cannot be undone.`}
      confirmLabel="Delete form"
      confirmVariant="destructive"
      isConfirming={isPending}
      onConfirm={handleDelete}
    />
  );
}
