import { StackedListCard } from "@/components/shared/stacked-list-card";

const processes = [
  {
    id: "approval-flow-a",
    title: "Approval Flow A",
    subtitle: "Current step: Manager Review",
    meta: "SLA: 4h",
  },
  {
    id: "compliance-flow",
    title: "Compliance Flow",
    subtitle: "Current step: Risk Review",
    meta: "SLA: 24h",
  },
  {
    id: "support-escalation",
    title: "Support Escalation",
    subtitle: "Current step: Tier 2 Queue",
    meta: "SLA: 2h",
  },
];

export default function FormProcessesPage() {
  return (
    <StackedListCard
      title="Form Processes"
      description="Hardcoded process stages and SLAs."
      items={processes}
    />
  );
}
