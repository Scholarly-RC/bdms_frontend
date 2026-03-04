"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteFormProcessAction } from "@/app/(workspace)/form-processes/_actions/form-processes";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import { Button } from "@/components/ui/button";

type DeleteFormProcessButtonProps = {
  processId: string;
  processName: string;
};

export function DeleteFormProcessButton({
  processId,
  processName,
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
        >
          <Trash2 className="size-4" />
          Delete
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
