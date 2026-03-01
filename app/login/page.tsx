import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/_actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    const user = await fetchAuthenticatedUser(accessToken);
    if (user) {
      redirect("/dashboard");
    }
  }

  const params = searchParams ? await searchParams : undefined;
  const errorMessage = params?.error;

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-transparent lg:grid-cols-[1.15fr_1fr]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,#d8e4d0_0,transparent_35%),radial-gradient(circle_at_88%_5%,#d3ddf0_0,transparent_28%)]" />

      <section className="relative hidden px-14 py-16 lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-5">
          <Badge className="rounded-full bg-zinc-950/90 px-3 py-1 text-zinc-50 shadow-sm">
            BDMS Workspace
          </Badge>
          <h1 className="max-w-xl text-5xl leading-[1.02] font-semibold tracking-tight text-zinc-950">
            A modern operations cockpit for your team.
          </h1>
          <p className="max-w-lg text-lg text-zinc-600">
            Monitor activity, align tasks, and move work forward from one
            streamlined dashboard.
          </p>
        </div>

        <div className="grid max-w-xl gap-4">
          <div className="rounded-2xl border border-zinc-300/70 bg-white/75 p-5 backdrop-blur-sm">
            <p className="text-sm text-zinc-700">
              "The new dashboard cut our daily reporting time by 40%."
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
              Ops Lead, BDMS Client Team
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-300/70 bg-white/75 p-4 backdrop-blur-sm">
              <p className="text-2xl font-semibold text-zinc-950">99.9%</p>
              <p className="text-sm text-zinc-600">Uptime monitoring</p>
            </div>
            <div className="rounded-2xl border border-zinc-300/70 bg-white/75 p-4 backdrop-blur-sm">
              <p className="text-2xl font-semibold text-zinc-950">24/7</p>
              <p className="text-sm text-zinc-600">Secure access</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center p-6 sm:p-8 lg:p-14">
        <Card className="w-full max-w-md border-zinc-300/70 bg-white/88 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <ShieldCheck className="size-4" />
              <span className="text-xs uppercase tracking-wide">
                Trusted Login
              </span>
            </div>
            <CardTitle className="text-3xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to continue to your BDMS dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" action={loginAction}>
              {errorMessage ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="#"
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Forgot password?
                  </Link>
                </div>
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

              <Button className="h-10 w-full gap-2 rounded-lg" type="submit">
                <LockKeyhole className="size-4" />
                Sign in
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-zinc-600">
              Need access?{" "}
              <Link
                href="#"
                className="font-medium text-zinc-900 hover:underline"
              >
                Contact your admin
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
