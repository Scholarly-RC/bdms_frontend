"use client";

import { Ban, CheckCircle2 } from "lucide-react";
import { useTransition } from "react";

import { updateFormStatusAction } from "@/app/(workspace)/forms/_actions/forms";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import { Button } from "@/components/ui/button";

type ToggleFormStatusButtonProps = {
  formId: string;
  formName: string;
  isActive: boolean;
};

export function ToggleFormStatusButton({
  formId,
  formName,
  isActive,
}: ToggleFormStatusButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(() => {
      void updateFormStatusAction(formId, !isActive);
    });
  };

  return (
    <ConfirmationModal
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={isPending}>
          {isActive ? (
            <Ban className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {isActive ? "Disable" : "Enable"}
        </Button>
      }
      title={isActive ? "Disable form?" : "Enable form?"}
      description={
        isActive
          ? `This will mark "${formName}" as inactive.`
          : `This will mark "${formName}" as active again.`
      }
      confirmLabel={isActive ? "Disable form" : "Enable form"}
      isConfirming={isPending}
      onConfirm={handleToggle}
    />
  );
}
