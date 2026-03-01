"use client";

import { useState } from "react";

import { createFormAction } from "@/app/(workspace)/forms/_actions/forms";
import { CreateFormSubmitButton } from "@/app/(workspace)/forms/_components/create-form-submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateFormDialog() {
  const [name, setName] = useState("");
  const [isPdfFile, setIsPdfFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const canSubmit = name.trim().length > 0 && isPdfFile;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="rounded-lg">
          Create form
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create form</DialogTitle>
          <DialogDescription>
            Add a name, description, and upload the source file.
          </DialogDescription>
        </DialogHeader>
        <form action={createFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Form name</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" maxLength={500} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setIsPdfFile(false);
                  setFileError(null);
                  return;
                }

                const isPdf =
                  file.name.toLowerCase().endsWith(".pdf") &&
                  (file.type === "" || file.type === "application/pdf");
                setIsPdfFile(isPdf);
                setFileError(isPdf ? null : "Only PDF files are allowed.");
              }}
            />
            {fileError ? (
              <p className="text-xs text-red-600">{fileError}</p>
            ) : null}
          </div>
          <CreateFormSubmitButton canSubmit={canSubmit} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
