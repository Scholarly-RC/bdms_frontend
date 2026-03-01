"use client";

import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DashboardAlertsButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => toast.info("No new alerts right now.")}
      type="button"
    >
      <Bell className="size-4" />
      Alerts
    </Button>
  );
}
