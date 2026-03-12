import { backendFetchFromSession } from "@/lib/api/server";

type BarangayProfilePayload = {
  province: string;
  municipality: string;
  barangay: string;
  region: string;
};

export async function PUT(request: Request): Promise<Response> {
  const body = (await request
    .json()
    .catch(() => null)) as BarangayProfilePayload | null;

  if (!body) {
    return Response.json(
      { detail: "Invalid request payload." },
      { status: 400 },
    );
  }

  const response = await backendFetchFromSession("/barangay-profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const contentType =
    response.headers.get("content-type") ?? "application/json";
  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
    },
  });
}
