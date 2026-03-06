"use client";

import {
  ArrowRight,
  FileText,
  ListChecks,
  MapPinned,
  PanelLeftClose,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthSignOutButton } from "@/components/shared/auth-sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: ArrowRight },
  { href: "/forms", label: "Forms", icon: FileText },
  { href: "/form-processes", label: "Form Processes", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: FileText },
];

const adminItems = [
  {
    href: "/barangay-profile",
    label: "Barangay Profile",
    icon: MapPinned,
  },
];

type WorkspaceSidebarProps = {
  appRole: "admin" | "user";
};

export function WorkspaceSidebar({ appRole }: WorkspaceSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-[calc(100svh-2rem)] flex-col rounded-2xl border border-zinc-300/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm sm:h-[calc(100svh-3rem)] sm:sticky sm:top-6 lg:h-[calc(100svh-4rem)] lg:top-8 lg:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">BDMS</p>
          <p className="text-xl font-semibold text-zinc-950">Control</p>
        </div>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md text-zinc-600"
          aria-label="Sidebar"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <Separator className="my-4" />

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "bg-zinc-900 text-zinc-50"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              <span>{item.label}</span>
              <Icon className="size-4" />
            </Link>
          );
        })}

        {appRole === "admin" ? (
          <>
            <p className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Admin
            </p>
            {adminItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors",
                    isActive
                      ? "bg-zinc-900 text-zinc-50"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  <span>{item.label}</span>
                  <Icon className="size-4" />
                </Link>
              );
            })}
          </>
        ) : null}
      </nav>

      <Card className="mt-6 border-zinc-300/70 bg-zinc-50/80 py-4">
        <CardContent className="space-y-3 px-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            System status
          </p>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-medium">All services healthy</p>
          </div>
        </CardContent>
      </Card>

      <AuthSignOutButton className="mt-4 w-full" />
    </aside>
  );
}
