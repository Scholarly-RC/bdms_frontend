"use client";

import { AlertCircle, FileText, LoaderCircle, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PdfFieldCandidate } from "@/app/(workspace)/forms/_lib/types";
import { Button } from "@/components/ui/button";

type PdfPreviewViewerProps = {
  activeCandidateIndex: number | null;
  candidates: PdfFieldCandidate[];
  createCandidateRequest: number;
  fileUrl: string;
  onCandidateChange: (
    candidateIndex: number,
    nextBbox: PdfFieldCandidate["bbox"],
  ) => void;
  onCandidateCommit: () => void;
  onCandidateCreate: (candidate: PdfFieldCandidate) => void;
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
  createCandidateRequest,
  fileUrl,
  onCandidateChange,
  onCandidateCommit,
  onCandidateCreate,
  onCandidateSelect,
}: PdfPreviewViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [zoom, setZoom] = useState(1);
  const interactionRef = useRef<ActiveInteraction | null>(null);
  const handledCreateRequestRef = useRef(0);
  const viewerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (
      createCandidateRequest === 0 ||
      createCandidateRequest === handledCreateRequestRef.current ||
      pages.length === 0
    ) {
      return;
    }

    handledCreateRequestRef.current = createCandidateRequest;
    const nextCandidate = createCandidateAtViewerCenter({
      candidates,
      pages,
      viewerElement: viewerRef.current,
    });

    onCandidateCreate(nextCandidate);
  }, [candidates, createCandidateRequest, onCandidateCreate, pages]);

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
    <div ref={viewerRef} className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold tracking-[0.24em] text-zinc-500 uppercase">
            Document Viewer
          </p>
          <p className="text-sm text-zinc-600">
            Scroll the canvas and drag fields directly on the page.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => {
              setZoom((current) =>
                Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))),
              );
            }}
          >
            <ZoomOut className="size-4" />
            <span className="sr-only">Zoom out</span>
          </Button>
          <div className="min-w-18 rounded-full bg-zinc-100 px-3 py-1 text-center text-xs font-semibold text-zinc-700">
            {Math.round(zoom * 100)}%
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => {
              setZoom((current) =>
                Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))),
              );
            }}
          >
            <ZoomIn className="size-4" />
            <span className="sr-only">Zoom in</span>
          </Button>
        </div>
      </div>
      <div className="h-[72vh] min-h-[36rem] rounded-[1.5rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_24%),linear-gradient(180deg,#ece8e1_0%,#e7e5e4_100%)] p-3 sm:p-4">
        <div className="h-full overflow-x-auto overflow-y-auto rounded-[1.15rem] bg-white/8 p-3 [scrollbar-color:rgba(120,113,108,0.72)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(120,113,108,0.72)] [&::-webkit-scrollbar-corner]:bg-transparent sm:p-5">
          <div className="space-y-8">
            {pageCandidates.map(({ candidates: pageItems, page }) => (
              <div key={page.pageNumber}>
                <div className="p-2 sm:p-4">
                <div
                  className="relative mx-auto overflow-hidden rounded-[1.1rem] border border-zinc-300/70 bg-white shadow-sm"
                  style={{
                    aspectRatio: `${page.width} / ${page.height}`,
                    width: `${zoom * 100}%`,
                  }}
                >
                  <img
                    src={page.dataUrl}
                    alt={`PDF page ${page.pageNumber}`}
                    className="block h-auto w-full max-w-none"
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
                            ? "border-cyan-500/95 bg-cyan-400/16 shadow-[0_0_0_2px_rgba(6,182,212,0.24)]"
                            : "border-emerald-600/70 bg-emerald-400/12 shadow-[0_0_0_1px_rgba(5,150,105,0.16)]"
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
                          className="pointer-events-none absolute inset-0 overflow-hidden px-1 py-0.5 leading-tight text-zinc-800/90"
                          style={{
                            fontSize: `${overlayFontSize}px`,
                          }}
                        >
                          {candidate.value?.trim() ? candidate.value : ""}
                        </span>
                        <span
                          className="absolute right-0 bottom-0 h-2.5 w-2.5 cursor-se-resize rounded-tl-sm bg-white/65"
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
                          <span className="absolute right-0 bottom-0 h-1.5 w-1.5 rounded-tl border-l border-t border-cyan-600/80" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createCandidateAtViewerCenter({
  candidates,
  pages,
  viewerElement,
}: {
  candidates: PdfFieldCandidate[];
  pages: RenderedPage[];
  viewerElement: HTMLDivElement | null;
}): PdfFieldCandidate {
  const targetPage = getCenteredPage(pages, viewerElement);
  const centerX = targetPage.pdfWidth / 2;
  const centerY = targetPage.pdfHeight / 2;
  const boxWidth = clamp(targetPage.pdfWidth * 0.26, 120, targetPage.pdfWidth * 0.45);
  const boxHeight = clamp(targetPage.pdfHeight * 0.035, 24, targetPage.pdfHeight * 0.08);
  const nextSpanIndex =
    candidates.reduce(
      (highestSpanIndex, candidate) => Math.max(highestSpanIndex, candidate.span_index),
      -1,
    ) + 1;
  const x1 = clamp(centerX - boxWidth / 2, 0, targetPage.pdfWidth - boxWidth);
  const y1 = clamp(centerY - boxHeight / 2, 0, targetPage.pdfHeight - boxHeight);

  return {
    anchor_after: "",
    anchor_before: "",
    bbox: roundBbox([x1, y1, x1 + boxWidth, y1 + boxHeight]),
    kind: "manual",
    label: "New field",
    line_text: "",
    match_text: "",
    name: `manual_field_${nextSpanIndex + 1}`,
    page: targetPage.pageNumber,
    rule: "",
    source: "manual",
    span_index: nextSpanIndex,
    value: "",
  };
}

function getCenteredPage(
  pages: RenderedPage[],
  viewerElement: HTMLDivElement | null,
): RenderedPage {
  if (!viewerElement) {
    return pages[0];
  }

  const viewerRect = viewerElement.getBoundingClientRect();
  const centerY = viewerRect.top + viewerRect.height / 2;
  let bestMatch = pages[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const page of pages) {
    const pageImage = viewerElement.querySelector<HTMLImageElement>(
      `img[alt="PDF page ${page.pageNumber}"]`,
    );
    const pageRect = pageImage?.getBoundingClientRect();
    if (!pageRect) {
      continue;
    }

    const clampedY = clamp(centerY, pageRect.top, pageRect.bottom);
    const distance = Math.abs(centerY - clampedY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = page;
    }
  }

  return bestMatch;
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
