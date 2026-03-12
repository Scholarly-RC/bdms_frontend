import type { FormRead } from "@/app/(workspace)/forms/_lib/types";

const formNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function sortFormsByName<T extends Pick<FormRead, "name">>(
  forms: T[],
): T[] {
  return [...forms].sort((left, right) =>
    formNameCollator.compare(left.name, right.name),
  );
}
