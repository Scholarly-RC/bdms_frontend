import { StackedListCard } from "@/components/shared/stacked-list-card";

const logs = [
  {
    id: "log-1302",
    title: "LOG-1302",
    subtitle: "Form submitted",
    meta: "By: jane@bdms.io",
  },
  {
    id: "log-1301",
    title: "LOG-1301",
    subtitle: "Approval completed",
    meta: "By: mike@bdms.io",
  },
  {
    id: "log-1300",
    title: "LOG-1300",
    subtitle: "Workflow updated",
    meta: "By: admin@bdms.io",
  },
];

export default function LogsPage() {
  return (
    <StackedListCard
      title="Logs"
      description="Hardcoded recent events for now."
      items={logs}
    />
  );
}
