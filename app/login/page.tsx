import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/_actions/auth";
import { LoginSubmitButton } from "@/app/login/_components/login-submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import { fetchAuthenticatedUser } from "@/lib/auth/server";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    const user = await fetchAuthenticatedUser(accessToken);
    if (user) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 sm:p-8">
      <Card className="w-full max-w-md border-zinc-300/70 bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to continue to your BDMS dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" action={loginAction}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                className="bg-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className="bg-white"
                required
              />
            </div>

            <LoginSubmitButton />
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
