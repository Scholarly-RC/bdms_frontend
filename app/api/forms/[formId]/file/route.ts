import { backendFetchFromSession } from "@/lib/api/server";

type Params = {
  params: Promise<{
    formId: string;
  }>;
};

export async function GET(_: Request, context: Params): Promise<Response> {
  const { formId } = await context.params;
  const normalizedFormId = formId.trim();

  if (!normalizedFormId) {
    return Response.json({ detail: "Invalid form id." }, { status: 400 });
  }

  const response = await backendFetchFromSession(
    `/forms/${encodeURIComponent(normalizedFormId)}/file`,
    {
      method: "GET",
    },
  );

  const body = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "application/pdf";
  const contentDisposition = response.headers.get("content-disposition");

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
      ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
    },
  });
}
