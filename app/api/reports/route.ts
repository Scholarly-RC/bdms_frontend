import { backendFetchFromSession } from "@/lib/api/server";

export async function GET(): Promise<Response> {
  const response = await backendFetchFromSession("/reports", {
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

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const response = await backendFetchFromSession("/reports", {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    body,
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
