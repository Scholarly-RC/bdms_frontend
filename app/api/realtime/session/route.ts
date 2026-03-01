import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import { getAuthConfig } from "@/lib/auth/server";

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return Response.json(
      { detail: "Missing authenticated session." },
      { status: 401 },
    );
  }

  const authConfig = getAuthConfig();
  return Response.json({
    supabaseUrl: authConfig.supabaseUrl,
    supabasePublishableKey: authConfig.supabasePublishableKey,
    accessToken,
  });
}
