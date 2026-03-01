"use client";

import { AlertCircle, FileText, LoaderCircle, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PdfFieldCandidate } from "@/app/(workspace)/forms/_lib/types";
import { Button } from "@/components/ui/button";

type PdfPreviewViewerProps = {
  activeCandidateIndex: number | null;
  candidates: PdfFieldCandidate[];
  fileUrl: string;
  onCandidateChange: (
    candidateIndex: number,
    nextBbox: PdfFieldCandidate["bbox"],
  ) => void;
  onCandidateCommit: () => void;
  onCandidateSelect: (candidateIndex: number | null) => void;
};

type RenderedPage = {
  dataUrl: string;
  height: number;
  pageNumber: number;
  pdfHeight: number;
  pdfWidth: number;
  width: number;
};

type DragMode = "move" | "resize";

type ActiveInteraction = {
  candidateIndex: number;
  containerRect: DOMRect;
  hasChanged: boolean;
  mode: DragMode;
  page: RenderedPage;
  startBbox: PdfFieldCandidate["bbox"];
  startX: number;
  startY: number;
};

const MIN_BOX_SIZE = 8;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;
const BASE_OVERLAY_FONT_SIZE = 10;

export function PdfPreviewViewer({
  activeCandidateIndex,
  candidates,
  fileUrl,
  onCandidateChange,
  onCandidateCommit,
  onCandidateSelect,
}: PdfPreviewViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [zoom, setZoom] = useState(1);
  const interactionRef = useRef<ActiveInteraction | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDocument = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdfDocument = await loadingTask.promise;
        const renderedPages: RenderedPage[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const pdfViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 1.35 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Unable to render PDF preview.");
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({ canvas, canvasContext: context, viewport }).promise;

          renderedPages.push({
            dataUrl: canvas.toDataURL("image/png"),
            height: canvas.height,
            pageNumber,
            pdfHeight: pdfViewport.height,
            pdfWidth: pdfViewport.width,
            width: canvas.width,
          });
        }

        if (!cancelled) {
          setPages(renderedPages);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "Unable to render PDF preview.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void renderDocument();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      event.preventDefault();

      const scaleX = interaction.page.pdfWidth / interaction.containerRect.width;
      const scaleY = interaction.page.pdfHeight / interaction.containerRect.height;
      const deltaX = (event.clientX - interaction.startX) * scaleX;
      const deltaY = (event.clientY - interaction.startY) * scaleY;
      const [x1, y1, x2, y2] = interaction.startBbox;
      const bboxWidth = x2 - x1;
      const bboxHeight = y2 - y1;

      let nextBbox: PdfFieldCandidate["bbox"];
      if (interaction.mode === "move") {
        const nextX1 = clamp(x1 + deltaX, 0, interaction.page.pdfWidth - bboxWidth);
        const nextY1 = clamp(y1 + deltaY, 0, interaction.page.pdfHeight - bboxHeight);
        nextBbox = [
          nextX1,
          nextY1,
          nextX1 + bboxWidth,
          nextY1 + bboxHeight,
        ];
      } else {
        const nextX2 = clamp(x2 + deltaX, x1 + MIN_BOX_SIZE, interaction.page.pdfWidth);
        const nextY2 = clamp(y2 + deltaY, y1 + MIN_BOX_SIZE, interaction.page.pdfHeight);
        nextBbox = [x1, y1, nextX2, nextY2];
      }

      const roundedBbox = roundBbox(nextBbox);
      if (isSameBbox(roundedBbox, interaction.startBbox)) {
        return;
      }

      interaction.hasChanged = true;
      onCandidateChange(interaction.candidateIndex, roundedBbox);
    };

    const handlePointerUp = () => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }
      interactionRef.current = null;
      if (!interaction.hasChanged) {
        return;
      }
      onCandidateCommit();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onCandidateChange, onCandidateCommit]);

  const pageCandidates = useMemo(
    () =>
      pages.map((page) => ({
        candidates: candidates
          .map((candidate, index) => ({ candidate, index }))
          .filter(({ candidate }) => candidate.page === page.pageNumber),
        page,
      })),
    [candidates, pages],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white/70 px-6 py-12 text-zinc-600">
        <div className="flex items-center gap-3 text-sm">
          <LoaderCircle className="size-4 animate-spin" />
          Rendering PDF preview...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-amber-950">
        <div className="flex max-w-md items-start gap-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white/70 px-6 py-12 text-zinc-600">
        <div className="flex items-center gap-3 text-sm">
          <FileText className="size-4" />
          No PDF pages were rendered.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => {
            setZoom((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))));
          }}
        >
          <ZoomOut className="size-4" />
          Zoom Out
        </Button>
        <div className="min-w-16 text-center text-sm font-medium text-zinc-600">
          {Math.round(zoom * 100)}%
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => {
            setZoom((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))));
          }}
        >
          <ZoomIn className="size-4" />
          Zoom In
        </Button>
      </div>
      {pageCandidates.map(({ candidates: pageItems, page }) => (
        <section
          key={page.pageNumber}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
        >
          <header className="border-b border-zinc-200 bg-linear-to-r from-zinc-100 to-stone-50 px-4 py-3">
            <p className="text-xs font-medium tracking-[0.24em] text-zinc-500 uppercase">
              Page {page.pageNumber}
            </p>
          </header>
          <div className="overflow-x-auto bg-[radial-gradient(circle_at_top,_rgba(231,229,228,0.55),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#f5f5f4_100%)] p-4 sm:p-6">
            <div
              className="relative mx-auto overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
              style={{
                aspectRatio: `${page.width} / ${page.height}`,
                width: `${zoom * 100}%`,
              }}
            >
              <img
                src={page.dataUrl}
                alt={`PDF page ${page.pageNumber}`}
                className="block h-auto w-full max-w-full"
                height={page.height}
                width={page.width}
              />
              {pageItems.map(({ candidate, index }) => {
                const [x1, y1, x2, y2] = candidate.bbox;
                const left = (x1 / page.pdfWidth) * 100;
                const top = (y1 / page.pdfHeight) * 100;
                const width = ((x2 - x1) / page.pdfWidth) * 100;
                const height = ((y2 - y1) / page.pdfHeight) * 100;
                const isActive = activeCandidateIndex === index;
                const overlayFontSize = clamp(
                  BASE_OVERLAY_FONT_SIZE * zoom,
                  8,
                  20,
                );

                return (
                  <button
                    key={`${candidate.page}-${candidate.span_index}-${index}`}
                    type="button"
                    data-candidate-index={index}
                    className={`absolute overflow-hidden rounded-sm border text-left transition ${
                      isActive
                        ? "border-cyan-500 bg-cyan-400/20 shadow-[0_0_0_2px_rgba(6,182,212,0.3)]"
                        : "border-emerald-500/90 bg-emerald-400/20 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                    }`}
                    style={{
                      height: `${height}%`,
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                    }}
                    title={`${candidate.kind}: ${candidate.match_text}`}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }
                      onCandidateSelect(index);
                      interactionRef.current = {
                        candidateIndex: index,
                        containerRect: event.currentTarget.parentElement!.getBoundingClientRect(),
                        hasChanged: false,
                        mode: "move",
                        page,
                        startBbox: candidate.bbox,
                        startX: event.clientX,
                        startY: event.clientY,
                      };
                      event.preventDefault();
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 overflow-hidden px-1 py-0.5 leading-tight text-zinc-800"
                      style={{
                        fontSize: `${overlayFontSize}px`,
                      }}
                    >
                      {candidate.value?.trim() ? candidate.value : ""}
                    </span>
                    <span
                      className="absolute right-0 bottom-0 h-2.5 w-2.5 cursor-se-resize"
                      onPointerDown={(event) => {
                        if (event.button !== 0) {
                          return;
                        }
                        event.stopPropagation();
                        onCandidateSelect(index);
                        interactionRef.current = {
                          candidateIndex: index,
                          containerRect:
                            event.currentTarget.parentElement!.parentElement!.getBoundingClientRect(),
                          hasChanged: false,
                          mode: "resize",
                          page,
                          startBbox: candidate.bbox,
                          startX: event.clientX,
                          startY: event.clientY,
                        };
                        event.preventDefault();
                      }}
                    >
                      <span className="absolute right-0 bottom-0 h-1.5 w-1.5 rounded-tl border-l border-t border-cyan-600/90" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundBbox(bbox: PdfFieldCandidate["bbox"]): PdfFieldCandidate["bbox"] {
  return bbox.map((value) => Number(value.toFixed(2))) as PdfFieldCandidate["bbox"];
}

function isSameBbox(
  left: PdfFieldCandidate["bbox"],
  right: PdfFieldCandidate["bbox"],
): boolean {
  return left.every((value, index) => value === right[index]);
}
