"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProcessFormOption = {
  id: string;
  name: string;
};

type ProcessFormSelectorProps = {
  options: ProcessFormOption[];
  selectedFormId: string;
  className?: string;
};

export function ProcessFormSelector({
  options,
  selectedFormId,
  className,
}: ProcessFormSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      id="process-form-selector"
      aria-label="Select form"
      value={selectedFormId}
      className={`h-9 w-56 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 ${className ?? ""}`}
      onChange={(event) => {
        const nextFormId = event.target.value;
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("formId", nextFormId);
        router.replace(`${pathname}?${nextParams.toString()}`);
      }}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
