import { StackedListCard } from "@/components/shared/stacked-list-card";

const forms = [
  {
    id: "employee-onboarding",
    title: "Employee Onboarding",
    subtitle: "Owner: HR",
    meta: "Status: Active",
  },
  {
    id: "access-request",
    title: "Access Request",
    subtitle: "Owner: IT",
    meta: "Status: Draft",
  },
  {
    id: "incident-intake",
    title: "Incident Intake",
    subtitle: "Owner: Operations",
    meta: "Status: Active",
  },
];

export default function FormsPage() {
  return (
    <StackedListCard
      title="Forms"
      description="Hardcoded sample forms for initial navigation."
      items={forms}
    />
  );
}
