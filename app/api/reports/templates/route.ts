import { backendFetchFromSession } from "@/lib/api/server";

export async function GET(): Promise<Response> {
  const response = await backendFetchFromSession("/reports/templates", {
    method: "GET",
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
