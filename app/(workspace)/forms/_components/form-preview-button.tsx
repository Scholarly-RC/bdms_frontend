"use client";

import { Eye, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FormPreviewButtonProps = {
  formDescription: string;
  formId: string;
  formName: string;
};

export function FormPreviewButton({
  formDescription,
  formId,
  formName,
}: FormPreviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const previewUrl = `/api/forms/${encodeURIComponent(formId)}/form-preview.pdf`;

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
        >
          <Eye />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[98vw] max-w-[98vw] sm:!max-w-[92rem] gap-4 border-zinc-300 bg-white p-0">
        <DialogHeader className="border-b border-zinc-200 px-6 py-4">
          <DialogTitle className="text-xl text-zinc-950">
            {formDescription}
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Rendered preview PDF generated from the DOCX template package for{" "}
            {formName}.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div className="relative h-[78vh] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
            {isLoading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/88 backdrop-blur-sm">
                <LoaderCircle className="size-8 animate-spin text-zinc-500" />
                <p className="text-sm text-zinc-600">Loading preview PDF...</p>
              </div>
            ) : null}
            <iframe
              title={`${formName} preview`}
              src={previewUrl}
              className="h-full w-full bg-white"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
