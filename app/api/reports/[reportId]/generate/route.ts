import { backendFetchFromSession } from "@/lib/api/server";

type Params = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function POST(_: Request, context: Params): Promise<Response> {
  const { reportId } = await context.params;
  const normalizedReportId = reportId.trim();

  if (!normalizedReportId) {
    return Response.json({ detail: "Invalid report id." }, { status: 400 });
  }

  const response = await backendFetchFromSession(
    `/reports/${encodeURIComponent(normalizedReportId)}/generate`,
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
