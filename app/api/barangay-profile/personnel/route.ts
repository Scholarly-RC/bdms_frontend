import { backendFetchFromSession } from "@/lib/api/server";

type BarangayPersonnelPayload = {
  full_name: string;
  position: string;
  sort_order: number;
};

export async function POST(request: Request): Promise<Response> {
  const body = (await request
    .json()
    .catch(() => null)) as BarangayPersonnelPayload | null;

  if (!body) {
    return Response.json(
      { detail: "Invalid request payload." },
      { status: 400 },
    );
  }

  const response = await backendFetchFromSession(
    "/barangay-profile/personnel",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

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
