import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PillProps = Omit<React.ComponentProps<typeof Badge>, "children"> & {
  value: string;
  icon?: React.ReactNode;
  normalizeValue?: boolean;
  titleCase?: boolean;
  children?: React.ReactNode;
};

export function formatPillValue(
  value: string,
  options?: { normalizeValue?: boolean; titleCase?: boolean },
): string {
  const normalizeValue = options?.normalizeValue ?? true;
  const titleCase = options?.titleCase ?? true;

  const normalized = normalizeValue
    ? value
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .replace(/\s+/g, " ")
        .trim()
    : value;

  if (!titleCase) {
    return normalized;
  }

  return normalized
    .toLocaleLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Pill({
  value,
  icon,
  normalizeValue = true,
  titleCase = true,
  className,
  children,
  ...props
}: PillProps) {
  return (
    <Badge
      className={cn("rounded-full border px-3 py-1", className)}
      {...props}
    >
      {icon}
      <span>{formatPillValue(value, { normalizeValue, titleCase })}</span>
      {children}
    </Badge>
  );
}
