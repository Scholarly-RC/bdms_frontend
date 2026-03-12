import { BarangayPersonnelTable } from "@/app/(workspace)/barangay-profile/_components/barangay-personnel-table";
import { BarangayProfileForm } from "@/app/(workspace)/barangay-profile/_components/barangay-profile-form";
import type {
  BarangayPersonnelRead,
  BarangayProfileRead,
} from "@/app/(workspace)/barangay-profile/_lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { backendFetchFromSession } from "@/lib/api/server";

async function fetchBarangayProfile(): Promise<BarangayProfileRead> {
  const response = await backendFetchFromSession("/barangay-profile", {
    method: "GET",
  });
  if (!response.ok) {
    return {
      province: "",
      municipality: "",
      barangay: "",
      region: "",
    };
  }

  const payload = (await response.json()) as BarangayProfileRead;
  return payload;
}

async function fetchBarangayPersonnel(): Promise<BarangayPersonnelRead[]> {
  const response = await backendFetchFromSession(
    "/barangay-profile/personnel",
    {
      method: "GET",
    },
  );
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as BarangayPersonnelRead[];
  return payload;
}

export default async function BarangayProfilePage() {
  const [profile, personnel] = await Promise.all([
    fetchBarangayProfile(),
    fetchBarangayPersonnel(),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Barangay Profile
        </h1>
        <p className="text-sm text-zinc-500">
          Manage singleton location details used across the system.
        </p>
      </header>

      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Location Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <BarangayProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <BarangayPersonnelTable initialPersonnel={personnel} />
        </CardContent>
      </Card>
    </div>
  );
}
