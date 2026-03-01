import "server-only";

import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getBackendApiBaseUrl(): string {
  return getEnv("BDMS_API_URL") ?? "http://127.0.0.1:8000/api/v1";
}

export async function backendFetchWithAccessToken(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = getBackendApiBaseUrl();

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

export async function backendFetchFromSession(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return new Response(null, { status: 401 });
  }

  return backendFetchWithAccessToken(path, accessToken, init);
}
