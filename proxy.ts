import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";

const protectedPaths = ["/dashboard", "/forms", "/form-processes", "/reports"];

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getAuthEndpoints() {
  const apiBaseUrl = getEnv("BDMS_API_URL") ?? "http://127.0.0.1:8000/api/v1";
  const supabaseUrl =
    getEnv("SUPABASE_PROJECT_URL") ??
    getEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    getEnv("SUPABASE_URL");
  const supabasePublishableKey =
    getEnv("SUPABASE_PUBLISHABLE_KEY") ??
    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    getEnv("SUPABASE_KEY");

  return { apiBaseUrl, supabaseUrl, supabasePublishableKey };
}

async function validateBackendToken(
  apiBaseUrl: string,
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  return response.ok;
}

type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

async function refreshSupabaseSession({
  supabaseUrl,
  supabasePublishableKey,
  refreshToken,
}: {
  supabaseUrl: string;
  supabasePublishableKey: string;
  refreshToken: string;
}): Promise<RefreshedSession | null> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token || !payload.refresh_token || !payload.expires_in) {
    return null;
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
  };
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const { apiBaseUrl, supabasePublishableKey, supabaseUrl } =
    getAuthEndpoints();

  if (!supabaseUrl || !supabasePublishableKey) {
    return redirectToLogin(request);
  }

  if (accessToken) {
    const isAccessTokenValid = await validateBackendToken(
      apiBaseUrl,
      accessToken,
    );
    if (isAccessTokenValid) {
      return NextResponse.next();
    }
  }

  if (!refreshToken) {
    return redirectToLogin(request);
  }

  const refreshed = await refreshSupabaseSession({
    supabaseUrl,
    supabasePublishableKey,
    refreshToken,
  });
  if (!refreshed) {
    return redirectToLogin(request);
  }

  const isRefreshedTokenValid = await validateBackendToken(
    apiBaseUrl,
    refreshed.accessToken,
  );
  if (!isRefreshedTokenValid) {
    return redirectToLogin(request);
  }

  const response = NextResponse.next();
  const isSecureCookie = request.nextUrl.protocol === "https:";

  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(refreshed.expiresIn, SESSION_COOKIE_MAX_AGE_SECONDS),
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/forms/:path*",
    "/form-processes/:path*",
    "/reports/:path*",
  ],
};
