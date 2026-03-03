import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { backendFetchFromSession } from "@/lib/api/server";
import { backendFetchWithAccessToken } from "@/lib/api/server";
import { refreshSession } from "@/lib/auth/server";

type Params = {
  params: Promise<{
    formId: string;
  }>;
};

export async function PUT(request: Request, context: Params): Promise<Response> {
  const { formId } = await context.params;
  const normalizedFormId = formId.trim();

  if (!normalizedFormId) {
    return Response.json({ detail: "Invalid form id." }, { status: 400 });
  }

  const body = await request.text();
  const forwarded = await fetchWithSessionRefresh(
    `/forms/${encodeURIComponent(normalizedFormId)}/extracted-fields`,
    {
      body,
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
      },
      method: "PUT",
    },
  );

  return toClientResponse(forwarded);
}

export async function DELETE(
  request: Request,
  context: Params,
): Promise<Response> {
  const { formId } = await context.params;
  const normalizedFormId = formId.trim();
  const requestBody = (await request.json().catch(() => null)) as
    | { candidateIndex?: number }
    | null;
  const candidateIndex = requestBody?.candidateIndex;

  if (!normalizedFormId) {
    return Response.json({ detail: "Invalid form id." }, { status: 400 });
  }

  if (
    typeof candidateIndex !== "number" ||
    !Number.isInteger(candidateIndex) ||
    candidateIndex < 0
  ) {
    return Response.json(
      { detail: "Invalid extracted field index." },
      { status: 400 },
    );
  }

  const forwarded = await fetchWithSessionRefresh(
    `/forms/${encodeURIComponent(normalizedFormId)}/extracted-fields/${candidateIndex}`,
    {
      method: "DELETE",
    },
  );

  return toClientResponse(forwarded);
}

export async function PATCH(request: Request, context: Params): Promise<Response> {
  const { formId } = await context.params;
  const normalizedFormId = formId.trim();
  const requestBody = (await request.json().catch(() => null)) as
    | {
        candidateIndex?: number;
        label?: string;
        name?: string;
        rule?: string;
        value?: string;
      }
    | null;
  const candidateIndex = requestBody?.candidateIndex;
  const label = requestBody?.label;
  const name = requestBody?.name;
  const rule = requestBody?.rule;
  const value = requestBody?.value;

  if (!normalizedFormId) {
    return Response.json({ detail: "Invalid form id." }, { status: 400 });
  }

  if (
    typeof candidateIndex !== "number" ||
    !Number.isInteger(candidateIndex) ||
    candidateIndex < 0
  ) {
    return Response.json(
      { detail: "Invalid extracted field index." },
      { status: 400 },
    );
  }

  if (typeof label !== "string") {
    return Response.json({ detail: "Invalid extracted field label." }, { status: 400 });
  }

  if (typeof name !== "string") {
    return Response.json({ detail: "Invalid extracted field name." }, { status: 400 });
  }

  if (typeof rule !== "string") {
    return Response.json({ detail: "Invalid extracted field rule." }, { status: 400 });
  }

  if (typeof value !== "string") {
    return Response.json({ detail: "Invalid extracted field value." }, { status: 400 });
  }

  const forwarded = await fetchWithSessionRefresh(
    `/forms/${encodeURIComponent(normalizedFormId)}/extracted-fields/${candidateIndex}`,
    {
      body: JSON.stringify({ label, name, rule, value }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );

  return toClientResponse(forwarded);
}

type ForwardedResponse = {
  refreshedSession:
    | {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }
    | null;
  response: Response;
};

async function fetchWithSessionRefresh(
  path: string,
  init: RequestInit,
): Promise<ForwardedResponse> {
  let response = await backendFetchFromSession(path, init);
  if (response.status !== 401) {
    return { refreshedSession: null, response };
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return { refreshedSession: null, response };
  }

  try {
    const refreshedSession = await refreshSession(refreshToken);
    response = await backendFetchWithAccessToken(path, refreshedSession.access_token, init);
    return {
      refreshedSession: {
        accessToken: refreshedSession.access_token,
        refreshToken: refreshedSession.refresh_token,
        expiresIn: refreshedSession.expires_in,
      },
      response,
    };
  } catch {
    return { refreshedSession: null, response };
  }
}

async function toClientResponse({
  response,
  refreshedSession,
}: ForwardedResponse): Promise<Response> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "application/json";
  const clientResponse = new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (refreshedSession) {
    const isSecureCookie = process.env.NODE_ENV === "production";
    clientResponse.cookies.set(ACCESS_TOKEN_COOKIE, refreshedSession.accessToken, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(refreshedSession.expiresIn, SESSION_COOKIE_MAX_AGE_SECONDS),
    });
    clientResponse.cookies.set(REFRESH_TOKEN_COOKIE, refreshedSession.refreshToken, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return clientResponse;
}
