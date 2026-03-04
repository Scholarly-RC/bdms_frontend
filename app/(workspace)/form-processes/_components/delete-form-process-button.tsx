"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteFormProcessAction } from "@/app/(workspace)/form-processes/_actions/form-processes";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import { Button } from "@/components/ui/button";

type DeleteFormProcessButtonProps = {
  processId: string;
  processName: string;
  iconOnly?: boolean;
};

export function DeleteFormProcessButton({
  processId,
  processName,
  iconOnly = false,
}: DeleteFormProcessButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(() => {
      void deleteFormProcessAction(processId);
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
          className={iconOnly ? "size-8 rounded-md p-0" : undefined}
          aria-label={`Delete ${processName}`}
          title="Delete process"
        >
          <Trash2 className="size-4" />
          {iconOnly ? <span className="sr-only">Delete</span> : "Delete"}
        </Button>
      }
      title="Delete form process?"
      description={`This will permanently remove ${processName} and all related records. This action cannot be undone.`}
      confirmLabel="Delete process"
      confirmVariant="destructive"
      isConfirming={isPending}
      onConfirm={handleDelete}
    />
  );
}
