"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

type FormProcessesSearchInputProps = {
  initialValue: string;
};

export function FormProcessesSearchInput({
  initialValue,
}: FormProcessesSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const { run: updateQuery } = useDebouncedCallback<string>((nextValue) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedValue = nextValue.trim();

    if (normalizedValue) {
      nextParams.set("q", normalizedValue);
    } else {
      nextParams.delete("q");
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, 250);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
      <Input
        type="search"
        value={value}
        placeholder="Search form processes"
        className="border-zinc-300 bg-white pl-9"
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          updateQuery(nextValue);
        }}
      />
    </div>
  );
}
