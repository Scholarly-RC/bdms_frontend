"use client";

import { Trash2 } from "lucide-react";

import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import { Button } from "@/components/ui/button";

type DeleteBarangayPersonnelButtonProps = {
  fullName: string;
  disabled?: boolean;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function DeleteBarangayPersonnelButton({
  fullName,
  disabled = false,
  isDeleting = false,
  onConfirm,
}: DeleteBarangayPersonnelButtonProps) {
  return (
    <ConfirmationModal
      trigger={
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          disabled={disabled || isDeleting}
          aria-label={`Delete ${fullName}`}
          title="Delete"
        >
          <Trash2 className="size-3" />
        </Button>
      }
      title="Delete personnel?"
      description={`This will permanently remove "${fullName}" from the barangay personnel list.`}
      confirmLabel="Delete personnel"
      confirmVariant="destructive"
      isConfirming={isDeleting}
      onConfirm={onConfirm}
    />
  );
}
