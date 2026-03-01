import "server-only";

import { cache } from "react";
import {
  backendFetchFromSession,
  backendFetchWithAccessToken,
} from "@/lib/api/server";

type SupabaseLoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

type BackendUser = {
  id: string;
  email: string | null;
  app_role: "admin" | "user";
};

type BackendMeResponse = {
  user: BackendUser;
};

type AuthConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const getAuthConfig = cache((): AuthConfig => {
  const supabaseUrl =
    getEnv("SUPABASE_PROJECT_URL") ??
    getEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    getEnv("SUPABASE_URL");
  const supabasePublishableKey =
    getEnv("SUPABASE_PUBLISHABLE_KEY") ??
    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    getEnv("SUPABASE_KEY");

  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_PROJECT_URL (or NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL).",
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "Missing SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_KEY).",
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
});

export async function signInWithPassword({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<SupabaseLoginResponse> {
  const { supabasePublishableKey, supabaseUrl } = getAuthConfig();
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { error_description?: string; msg?: string }
    | SupabaseLoginResponse
    | null;

  if (!response.ok) {
    const message =
      (payload &&
        "error_description" in payload &&
        payload.error_description) ||
      (payload && "msg" in payload && payload.msg) ||
      "Invalid email or password.";
    throw new Error(message);
  }

  return payload as SupabaseLoginResponse;
}

export async function refreshSession(
  refreshToken: string,
): Promise<SupabaseLoginResponse> {
  const { supabasePublishableKey, supabaseUrl } = getAuthConfig();
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

  const payload = (await response.json().catch(() => null)) as
    | { error_description?: string; msg?: string }
    | SupabaseLoginResponse
    | null;

  if (!response.ok) {
    const message =
      (payload &&
        "error_description" in payload &&
        payload.error_description) ||
      (payload && "msg" in payload && payload.msg) ||
      "Unable to refresh session.";
    throw new Error(message);
  }

  return payload as SupabaseLoginResponse;
}

export async function fetchAuthenticatedUser(
  accessToken: string,
): Promise<BackendUser | null> {
  const response = await backendFetchWithAccessToken("/auth/me", accessToken, {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as BackendMeResponse;
  return payload.user;
}

export async function fetchAuthenticatedUserFromSession(): Promise<BackendUser | null> {
  const response = await backendFetchFromSession("/auth/me", {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as BackendMeResponse;
  return payload.user;
}
