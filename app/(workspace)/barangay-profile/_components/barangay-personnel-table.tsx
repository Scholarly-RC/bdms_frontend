"use client";

import { Pencil, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteBarangayPersonnelButton } from "@/app/(workspace)/barangay-profile/_components/delete-barangay-personnel-button";
import type { BarangayPersonnelRead } from "@/app/(workspace)/barangay-profile/_lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BarangayPersonnelTableProps = {
  initialPersonnel: BarangayPersonnelRead[];
};

type DraftPersonnel = {
  full_name: string;
  position: string;
};

const EMPTY_DRAFT: DraftPersonnel = {
  full_name: "",
  position: "",
};

export function BarangayPersonnelTable({
  initialPersonnel,
}: BarangayPersonnelTableProps) {
  const router = useRouter();
  const [personnel, setPersonnel] =
    useState<BarangayPersonnelRead[]>(initialPersonnel);
  const [newDraft, setNewDraft] = useState<DraftPersonnel>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftPersonnel>(EMPTY_DRAFT);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const startAdding = () => {
    setIsAdding(true);
    setNewDraft(EMPTY_DRAFT);
    setEditingId(null);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewDraft(EMPTY_DRAFT);
  };

  const startEditing = (row: BarangayPersonnelRead) => {
    setEditingId(row.id);
    setEditDraft({
      full_name: row.full_name,
      position: row.position,
    });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const handleAdd = async () => {
    const fullName = newDraft.full_name.trim();
    const position = newDraft.position.trim();
    if (!fullName || !position) {
      toast.error("Personnel name and position are required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/barangay-profile/personnel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          position,
          sort_order: personnel.length,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast.error(payload?.detail ?? "Unable to add personnel.");
        return;
      }

      const created = (await response.json()) as BarangayPersonnelRead;
      setPersonnel((current) => [...current, created]);
      setIsAdding(false);
      setNewDraft(EMPTY_DRAFT);
      toast.success("Personnel added.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) {
      return;
    }

    const fullName = editDraft.full_name.trim();
    const position = editDraft.position.trim();
    if (!fullName || !position) {
      toast.error("Personnel name and position are required.");
      return;
    }

    const currentRow = personnel.find((row) => row.id === editingId);
    if (!currentRow) {
      toast.error("Personnel row no longer exists.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/barangay-profile/personnel/${encodeURIComponent(editingId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: fullName,
            position,
            sort_order: currentRow.sort_order,
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast.error(payload?.detail ?? "Unable to update personnel.");
        return;
      }

      const updated = (await response.json()) as BarangayPersonnelRead;
      setPersonnel((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      setEditingId(null);
      setEditDraft(EMPTY_DRAFT);
      toast.success("Personnel updated.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row: BarangayPersonnelRead) => {
    setIsDeletingId(row.id);
    try {
      const response = await fetch(
        `/api/barangay-profile/personnel/${encodeURIComponent(row.id)}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast.error(payload?.detail ?? "Unable to delete personnel.");
        return;
      }

      setPersonnel((current) => current.filter((item) => item.id !== row.id));
      if (editingId === row.id) {
        setEditingId(null);
        setEditDraft(EMPTY_DRAFT);
      }
      toast.success("Personnel deleted.");
      router.refresh();
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={startAdding}
          disabled={isAdding || isSaving || Boolean(editingId)}
        >
          <Plus className="size-4" />
          Add Personnel
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80">
              <TableHead className="h-11 w-[42%] pl-4 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500">
                Name
              </TableHead>
              <TableHead className="h-11 w-[42%] text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500">
                Position
              </TableHead>
              <TableHead className="h-11 w-[16%] pr-4 text-right text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personnel.length === 0 && !isAdding ? (
              <TableRow className="border-zinc-200/70">
                <TableCell
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-zinc-500"
                >
                  No personnel added yet.
                </TableCell>
              </TableRow>
            ) : null}

            {personnel.map((row) => {
              const isEditingRow = editingId === row.id;
              const isDeletingRow = isDeletingId === row.id;

              return (
                <TableRow
                  key={row.id}
                  className="border-zinc-200/70 align-middle hover:bg-zinc-50/70"
                >
                  <TableCell className="pl-4 py-2">
                    {isEditingRow ? (
                      <Input
                        value={editDraft.full_name}
                        maxLength={160}
                        onChange={(event) =>
                          setEditDraft((current) => ({
                            ...current,
                            full_name: event.target.value,
                          }))
                        }
                        disabled={isSaving}
                      />
                    ) : (
                      <span className="text-zinc-900">{row.full_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {isEditingRow ? (
                      <Input
                        value={editDraft.position}
                        maxLength={120}
                        onChange={(event) =>
                          setEditDraft((current) => ({
                            ...current,
                            position: event.target.value,
                          }))
                        }
                        disabled={isSaving}
                      />
                    ) : (
                      <span className="text-zinc-700">{row.position}</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 py-2">
                    {isEditingRow ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          onClick={() => void handleSaveEdit()}
                          disabled={isSaving}
                          aria-label="Save personnel"
                          title="Save"
                        >
                          <Save className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          aria-label="Cancel edit"
                          title="Cancel"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          onClick={() => startEditing(row)}
                          disabled={isSaving || isDeletingRow || isAdding}
                          aria-label="Edit personnel"
                          title="Edit"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <DeleteBarangayPersonnelButton
                          fullName={row.full_name}
                          disabled={
                            isSaving || isDeletingRow || Boolean(editingId)
                          }
                          isDeleting={isDeletingRow}
                          onConfirm={() => handleDelete(row)}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {isAdding ? (
              <TableRow className="border-zinc-200/70 align-middle bg-zinc-50/50">
                <TableCell className="pl-4 py-2">
                  <Input
                    value={newDraft.full_name}
                    maxLength={160}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    placeholder="Full name"
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    value={newDraft.position}
                    maxLength={120}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        position: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    placeholder="Position"
                  />
                </TableCell>
                <TableCell className="pr-4 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="icon-xs"
                      onClick={() => void handleAdd()}
                      disabled={isSaving}
                      aria-label="Save new personnel"
                      title="Save"
                    >
                      <Save className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      onClick={cancelAdding}
                      disabled={isSaving}
                      aria-label="Cancel new personnel"
                      title="Cancel"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
