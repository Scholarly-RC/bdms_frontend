import { backendFetchFromSession } from "@/lib/api/server";

type Params = {
  params: Promise<{
    personnelId: string;
  }>;
};

type BarangayPersonnelPayload = {
  full_name: string;
  position: string;
  sort_order: number;
};

export async function PUT(
  request: Request,
  context: Params,
): Promise<Response> {
  const { personnelId } = await context.params;
  const normalizedPersonnelId = personnelId.trim();
  const body = (await request
    .json()
    .catch(() => null)) as BarangayPersonnelPayload | null;

  if (!normalizedPersonnelId) {
    return Response.json({ detail: "Invalid personnel id." }, { status: 400 });
  }

  if (!body) {
    return Response.json(
      { detail: "Invalid request payload." },
      { status: 400 },
    );
  }

  const response = await backendFetchFromSession(
    `/barangay-profile/personnel/${encodeURIComponent(normalizedPersonnelId)}`,
    {
      method: "PUT",
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

export async function DELETE(
  _request: Request,
  context: Params,
): Promise<Response> {
  const { personnelId } = await context.params;
  const normalizedPersonnelId = personnelId.trim();

  if (!normalizedPersonnelId) {
    return Response.json({ detail: "Invalid personnel id." }, { status: 400 });
  }

  const response = await backendFetchFromSession(
    `/barangay-profile/personnel/${encodeURIComponent(normalizedPersonnelId)}`,
    {
      method: "DELETE",
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
