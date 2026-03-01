"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { signInWithPassword } from "@/lib/auth/server";
import { loginFormSchema } from "@/lib/validation/form-actions";

const isSecureCookie = process.env.NODE_ENV === "production";

export async function loginAction(formData: FormData): Promise<void> {
  const parsed = loginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=Please%20enter%20email%20and%20password");
  }

  try {
    const { email, password } = parsed.data;
    const session = await signInWithPassword({ email, password });
    const cookieStore = await cookies();

    cookieStore.set(ACCESS_TOKEN_COOKIE, session.access_token, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(session.expires_in, SESSION_COOKIE_MAX_AGE_SECONDS),
    });

    cookieStore.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to sign in. Please try again.";

    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  redirect("/login?success=Signed%20out%20successfully.");
}
