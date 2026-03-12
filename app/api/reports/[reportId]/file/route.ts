import { backendFetchFromSession } from "@/lib/api/server";

type Params = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function GET(
  request: Request,
  context: Params,
): Promise<Response> {
  const { reportId } = await context.params;
  const normalizedReportId = reportId.trim();

  if (!normalizedReportId) {
    return Response.json({ detail: "Invalid report id." }, { status: 400 });
  }

  const searchParams = new URL(request.url).searchParams;
  const format = searchParams.get("format")?.trim().toLowerCase() ?? "pdf";
  if (format !== "pdf" && format !== "word") {
    return Response.json({ detail: "Invalid format." }, { status: 400 });
  }

  const response = await backendFetchFromSession(
    `/reports/${encodeURIComponent(normalizedReportId)}/file?format=${encodeURIComponent(format)}`,
    {
      method: "GET",
    },
  );
  const body = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const contentDisposition = response.headers.get("content-disposition");

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
      ...(contentDisposition
        ? { "Content-Disposition": contentDisposition }
        : {}),
    },
  });
}
