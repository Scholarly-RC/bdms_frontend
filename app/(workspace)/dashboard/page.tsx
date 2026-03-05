import { CalendarRange, Clock3, Layers } from "lucide-react";

import { DashboardAlertsButton } from "@/components/shared/dashboard-alerts-button";
import { Pill } from "@/components/shared/pill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const quickStats = [
  { label: "Open cases", value: "48", change: "+6 today" },
  { label: "Resolved", value: "132", change: "+18 this week" },
  { label: "SLA health", value: "96%", change: "On target" },
];

const pipeline = [
  { team: "Onboarding", progress: 84 },
  { team: "Compliance", progress: 67 },
  { team: "Support", progress: 91 },
];

export default function DashboardPage() {
  return (
    <>
      <header className="rounded-2xl border border-zinc-300/70 bg-white/82 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">Sunday briefing</p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Dashboard Overview
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <DashboardAlertsButton />
            <Avatar>
              <AvatarFallback>SA</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {quickStats.map((stat) => (
          <Card
            key={stat.label}
            className="border-zinc-300/70 bg-white/82 py-4 backdrop-blur-sm"
          >
            <CardContent className="space-y-1 px-4">
              <p className="text-sm text-zinc-600">{stat.label}</p>
              <p className="text-3xl font-semibold text-zinc-950">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Layers className="size-5" /> Team pipeline
            </CardTitle>
            <CardDescription>
              Current throughput and completion performance by team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipeline.map((row) => (
              <div key={row.team} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-800">{row.team}</span>
                  <span className="text-zinc-500">{row.progress}%</span>
                </div>
                <Progress value={row.progress} className="h-2.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Next actions</CardTitle>
            <CardDescription>
              Priorities to close before the next reporting cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CalendarRange className="size-4" /> Monthly audit pack
              </div>
              <Pill value="due tomorrow" variant="secondary" />
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Clock3 className="size-4" /> Incident postmortem review
              </div>
              <Pill value="in progress" variant="outline" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
