import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  backendFetchFromSession,
  backendFetchWithAccessToken,
} from "@/lib/api/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { refreshSession } from "@/lib/auth/server";

type Params = {
  params: Promise<{
    processId: string;
    processFormId: string;
  }>;
};

export async function GET(_: Request, context: Params): Promise<Response> {
  const { processId, processFormId } = await context.params;
  const normalizedProcessId = processId.trim();
  const normalizedProcessFormId = processFormId.trim();

  if (!normalizedProcessId || !normalizedProcessFormId) {
    return Response.json(
      { detail: "Invalid process form id." },
      { status: 400 },
    );
  }

  const forwarded = await fetchWithSessionRefresh(
    `/processes/${encodeURIComponent(normalizedProcessId)}/forms/${encodeURIComponent(
      normalizedProcessFormId,
    )}/file`,
    {
      method: "GET",
    },
  );

  return toClientResponse(forwarded);
}

type ForwardedResponse = {
  refreshedSession: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null;
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
    response = await backendFetchWithAccessToken(
      path,
      refreshedSession.access_token,
      init,
    );
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
  const body = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const contentDisposition = response.headers.get("content-disposition");
  const clientResponse = new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
      ...(contentDisposition
        ? { "Content-Disposition": contentDisposition }
        : {}),
    },
  });

  if (refreshedSession) {
    const isSecureCookie = process.env.NODE_ENV === "production";
    clientResponse.cookies.set(
      ACCESS_TOKEN_COOKIE,
      refreshedSession.accessToken,
      {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: Math.min(
          refreshedSession.expiresIn,
          SESSION_COOKIE_MAX_AGE_SECONDS,
        ),
      },
    );
    clientResponse.cookies.set(
      REFRESH_TOKEN_COOKIE,
      refreshedSession.refreshToken,
      {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
      },
    );
  }

  return clientResponse;
}
