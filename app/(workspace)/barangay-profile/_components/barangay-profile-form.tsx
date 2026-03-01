"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BarangayProfileRead = {
  province: string;
  municipality: string;
  barangay: string;
};

type BarangayProfileFormProps = {
  profile: BarangayProfileRead;
};

export function BarangayProfileForm({ profile }: BarangayProfileFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCancel = () => {
    formRef.current?.reset();
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const province = String(formData.get("province") ?? "").trim();
    const municipality = String(formData.get("municipality") ?? "").trim();
    const barangay = String(formData.get("barangay") ?? "").trim();

    if (!province || !municipality || !barangay) {
      toast.error("All fields are required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/barangay-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          province,
          municipality,
          barangay,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast.error(payload?.detail ?? "Unable to save barangay profile.");
        return;
      }

      toast.success("Barangay profile saved successfully.");
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="province">Province</Label>
        <Input
          id="province"
          name="province"
          required
          maxLength={120}
          defaultValue={profile.province}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="municipality">Municipality</Label>
        <Input
          id="municipality"
          name="municipality"
          required
          maxLength={120}
          defaultValue={profile.municipality}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="barangay">Barangay</Label>
        <Input
          id="barangay"
          name="barangay"
          required
          maxLength={120}
          defaultValue={profile.barangay}
          disabled={!isEditing}
        />
      </div>

      {isEditing ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSaving} aria-disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            aria-disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
      )}
    </form>
  );
}
