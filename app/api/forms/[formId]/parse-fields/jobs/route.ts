import { backendFetchFromSession } from "@/lib/api/server";

type Params = {
  params: Promise<{
    formId: string;
  }>;
};

export async function POST(_: Request, context: Params): Promise<Response> {
  const { formId } = await context.params;
  const normalizedFormId = formId.trim();

  if (!normalizedFormId) {
    return Response.json({ detail: "Invalid form id." }, { status: 400 });
  }

  const response = await backendFetchFromSession(
    `/forms/${encodeURIComponent(normalizedFormId)}/parse-fields/jobs`,
    {
      method: "POST",
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
