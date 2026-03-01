"use client";

import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { ExternalLink, LoaderCircle, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { PdfFieldParseResult } from "@/app/(workspace)/forms/_lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

type JobRead = {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  error: string | null;
  result: PdfFieldParseResult | null;
};

type RealtimeSession = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  accessToken: string;
};

type ExtractFieldsButtonProps = {
  formId: string;
  existingResult: PdfFieldParseResult | null;
  extractedFieldsCount: number;
};

export function ExtractFieldsButton({
  formId,
  existingResult,
  extractedFieldsCount,
}: ExtractFieldsButtonProps) {
  const toastId = `extract-fields-${formId}`;
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [job, setJob] = useState<JobRead | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const hasExistingExtraction =
    extractedFieldsCount > 0 && existingResult !== null;
  const isJobActive = job !== null && isInFlightJobStatus(job.status);

  const cleanupRealtime = useCallback(() => {
    if (channelRef.current && supabaseRef.current) {
      void supabaseRef.current.removeChannel(channelRef.current);
    }
    channelRef.current = null;
    supabaseRef.current = null;
  }, []);

  const cleanupSubscriptions = useCallback(() => {
    cleanupRealtime();
  }, [cleanupRealtime]);

  useEffect(() => {
    return () => {
      cleanupSubscriptions();
    };
  }, [cleanupSubscriptions]);

  const handleJobUpdate = useCallback(
    (next: JobRead) => {
      setJob(next);

      if (next.status === "queued" || next.status === "running") {
        toast.loading(getJobToastTitle(next.status), {
          id: toastId,
          description: getJobToastDescription(next),
        });
        return;
      }

      if (next.status === "succeeded") {
        toast.success("Field extraction completed.", {
          id: toastId,
          description: "Opening the preview with refreshed field candidates.",
        });
        cleanupSubscriptions();
        window.location.assign(
          `/forms/${encodeURIComponent(formId)}/preview?refresh=1`,
        );
        return;
      }

      if (next.status === "failed") {
        toast.error(next.error ?? "Field extraction failed.", {
          id: toastId,
        });
        cleanupSubscriptions();
        return;
      }

      if (next.status === "cancelled") {
        toast.error("Field extraction was cancelled.", {
          id: toastId,
        });
        cleanupSubscriptions();
      }
    },
    [cleanupSubscriptions, formId, toastId],
  );

  const subscribeToJobUpdates = async (jobId: string) => {
    const realtimeResponse = await fetch("/api/realtime/session", {
      method: "GET",
      cache: "no-store",
    });
    if (!realtimeResponse.ok) {
      throw new Error("Unable to initialize realtime subscription.");
    }

    const realtimeSession = (await realtimeResponse.json()) as RealtimeSession;
    const supabase = createClient(
      realtimeSession.supabaseUrl,
      realtimeSession.supabasePublishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    supabase.realtime.setAuth(realtimeSession.accessToken);

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const next = payload.new as JobRead;
          handleJobUpdate(next);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          return;
        }
        if (status === "CHANNEL_ERROR") {
          toast.error("Live extraction updates are unavailable.", {
            id: toastId,
          });
        }
      });

    supabaseRef.current = supabase;
    channelRef.current = channel;
  };

  const queueExtraction = async () => {
    setIsLoading(true);
    setIsConfirmOpen(false);
    setJob(null);
    cleanupSubscriptions();
    try {
      const response = await fetch(
        `/api/forms/${encodeURIComponent(formId)}/parse-fields/jobs`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast.error(payload?.detail ?? "Unable to extract fields.");
        return;
      }

      const payload = (await response.json()) as JobRead;
      setJob(payload);
      toast.loading("Extraction queued", {
        id: toastId,
        description: "Waiting for the worker to start processing this form.",
      });
      try {
        await subscribeToJobUpdates(payload.id);
      } catch {
        toast.error("Unable to subscribe to live extraction updates.", {
          id: toastId,
        });
      }
    } catch {
      toast.error("Unable to extract fields.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractClick = () => {
    if (hasExistingExtraction) {
      setIsConfirmOpen(true);
      return;
    }
    void queueExtraction();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {hasExistingExtraction ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/forms/${encodeURIComponent(formId)}/preview`}>
              <ExternalLink className="size-4" />
              Preview
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || isJobActive}
          onClick={handleExtractClick}
        >
          {isLoading || isJobActive ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {isLoading
            ? "Queuing..."
            : isJobActive
              ? "Extracting..."
              : "Extract Fields"}
        </Button>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Override Existing Extraction?</DialogTitle>
            <DialogDescription>
              This form already has {extractedFieldsCount} extracted candidate
              field(s). Running extraction again will replace the current saved
              result.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void queueExtraction()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function isInFlightJobStatus(status: JobStatus): boolean {
  return status === "queued" || status === "running";
}

function getJobToastTitle(status: JobStatus): string {
  if (status === "queued") {
    return "Extraction queued";
  }
  if (status === "running") {
    return "Extraction in progress";
  }
  if (status === "succeeded") {
    return "Extraction completed";
  }
  if (status === "failed") {
    return "Extraction failed";
  }
  return "Extraction cancelled";
}

function getJobToastDescription(job: JobRead): string {
  if (job.status === "queued") {
    return "Waiting for the worker to start processing this form.";
  }
  if (job.status === "running") {
    return `Progress: ${job.progress}%`;
  }
  if (job.status === "failed") {
    return job.error ?? "Extraction failed before a result was saved.";
  }
  return "Extraction was cancelled before completion.";
}
