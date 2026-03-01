import { StackedListCard } from "@/components/shared/stacked-list-card";

const reports = [
  {
    id: "weekly-throughput",
    title: "Weekly Throughput",
    subtitle: "Frequency: Weekly",
    meta: "Format: PDF",
  },
  {
    id: "compliance-snapshot",
    title: "Compliance Snapshot",
    subtitle: "Frequency: Monthly",
    meta: "Format: CSV",
  },
  {
    id: "sla-breach-summary",
    title: "SLA Breach Summary",
    subtitle: "Frequency: Daily",
    meta: "Format: Dashboard",
  },
];

export default function ReportsPage() {
  return (
    <StackedListCard
      title="Reports"
      description="Hardcoded reports list for initial scaffolding."
      items={reports}
    />
  );
}
