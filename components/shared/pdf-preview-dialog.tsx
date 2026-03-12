"use client";

import type { Dispatch, SetStateAction } from "react";

import { PdfPreviewViewer } from "@/components/shared/pdf-preview-viewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PdfPreviewDialogProps = {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void);
  title: string;
  description: string;
  viewerTitle: string;
  src: string | null;
  viewerKey?: string;
};

export function PdfPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  viewerTitle,
  src,
  viewerKey,
}: PdfPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] p-3 pt-14 sm:max-w-[95vw]">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="h-[calc(92vh-3.5rem)] overflow-hidden rounded-lg">
          {src ? (
            <PdfPreviewViewer
              key={viewerKey ?? src}
              title={viewerTitle}
              src={src}
              className="h-full"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
