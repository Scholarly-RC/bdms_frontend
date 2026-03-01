"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function QueryParamToasts() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastToastKeyRef = useRef<string | null>(null);

  const errorMessage = searchParams.get("error");
  const successMessage = searchParams.get("success");

  useEffect(() => {
    const message = errorMessage ?? successMessage;
    if (!message) {
      return;
    }

    const type = errorMessage ? "error" : "success";
    const toastKey = `${pathname}:${type}:${message}`;
    if (toastKey === lastToastKeyRef.current) {
      return;
    }

    lastToastKeyRef.current = toastKey;
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success(successMessage);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    params.delete("success");
    const nextParams = params.toString();
    const nextUrl = nextParams ? `${pathname}?${nextParams}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [errorMessage, pathname, router, searchParams, successMessage]);

  return null;
}
