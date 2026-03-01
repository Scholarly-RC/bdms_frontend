"use client";

import { createFormProcessAction } from "@/app/(workspace)/form-processes/_actions/form-processes";
import { CreateFormProcessSubmitButton } from "@/app/(workspace)/form-processes/_components/create-form-process-submit-button";
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

type FormOption = {
  id: string;
  name: string;
};

type CreateFormProcessDialogProps = {
  forms: FormOption[];
};

export function CreateFormProcessDialog({
  forms,
}: CreateFormProcessDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="rounded-lg">
          Create process
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create form process</DialogTitle>
          <DialogDescription>
            Choose a form and set the initial context and status.
          </DialogDescription>
        </DialogHeader>
        <form action={createFormProcessAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form_id">Form</Label>
            <select
              id="form_id"
              name="form_id"
              defaultValue=""
              required
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select a form
              </option>
              {forms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Input id="context" name="context" required maxLength={1000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              name="status"
              placeholder="draft"
              defaultValue="draft"
              maxLength={120}
            />
          </div>
          <CreateFormProcessSubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
