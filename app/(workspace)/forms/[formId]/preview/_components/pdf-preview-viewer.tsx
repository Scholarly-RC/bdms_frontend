"use client";

import {
  AlertCircle,
  FileText,
  LoaderCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PdfFieldCandidate } from "@/app/(workspace)/forms/_lib/types";
import { Button } from "@/components/ui/button";

type PdfPreviewViewerProps = {
  activeCandidateIndex: number | null;
  candidates: PdfFieldCandidate[];
  createCandidateRequest: number;
  fileUrl: string;
  showBboxes?: boolean;
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

type ResizeHandle = "nw" | "ne" | "sw" | "se";
type DragMode = "move" | "resize";

type ActiveInteraction = {
  candidateIndex: number;
  containerRect: DOMRect;
  hasChanged: boolean;
  handle?: ResizeHandle;
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
const BASE_OVERLAY_FONT_SIZE = 11;
const OVERLAY_FONT_FAMILY =
  '"Bookman Old Style", "URW Bookman L", "Bookman", "Times New Roman", serif';

export function PdfPreviewViewer({
  activeCandidateIndex,
  candidates,
  createCandidateRequest,
  fileUrl,
  showBboxes = true,
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

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber += 1
        ) {
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

          await page.render({ canvas, canvasContext: context, viewport })
            .promise;

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

      const scaleX =
        interaction.page.pdfWidth / interaction.containerRect.width;
      const scaleY =
        interaction.page.pdfHeight / interaction.containerRect.height;
      const deltaX = (event.clientX - interaction.startX) * scaleX;
      const deltaY = (event.clientY - interaction.startY) * scaleY;
      const [x1, y1, x2, y2] = interaction.startBbox;
      const bboxWidth = x2 - x1;
      const bboxHeight = y2 - y1;

      let nextBbox: PdfFieldCandidate["bbox"];
      if (interaction.mode === "move") {
        const nextX1 = clamp(
          x1 + deltaX,
          0,
          interaction.page.pdfWidth - bboxWidth,
        );
        const nextY1 = clamp(
          y1 + deltaY,
          0,
          interaction.page.pdfHeight - bboxHeight,
        );
        nextBbox = [nextX1, nextY1, nextX1 + bboxWidth, nextY1 + bboxHeight];
      } else {
        nextBbox = resizeBboxFromHandle({
          handle: interaction.handle ?? "se",
          page: interaction.page,
          startBbox: interaction.startBbox,
          deltaX,
          deltaY,
        });
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeCandidateIndex === null) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      let deltaX = 0;
      let deltaY = 0;
      if (event.key === "ArrowLeft") {
        deltaX = -1;
      } else if (event.key === "ArrowRight") {
        deltaX = 1;
      } else if (event.key === "ArrowUp") {
        deltaY = -1;
      } else if (event.key === "ArrowDown") {
        deltaY = 1;
      } else {
        return;
      }

      const candidate = candidates[activeCandidateIndex];
      if (!candidate) {
        return;
      }

      const page = pages.find((item) => item.pageNumber === candidate.page);
      if (!page) {
        return;
      }

      event.preventDefault();
      const [x1, y1, x2, y2] = candidate.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      const nextX1 = clamp(x1 + deltaX, 0, page.pdfWidth - width);
      const nextY1 = clamp(y1 + deltaY, 0, page.pdfHeight - height);
      const nextBbox = roundBbox([
        nextX1,
        nextY1,
        nextX1 + width,
        nextY1 + height,
      ]);
      if (isSameBbox(nextBbox, candidate.bbox)) {
        return;
      }

      onCandidateChange(activeCandidateIndex, nextBbox);
      onCandidateCommit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeCandidateIndex,
    candidates,
    onCandidateChange,
    onCandidateCommit,
    pages,
  ]);

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
                    onPointerDown={() => {
                      onCandidateSelect(null);
                    }}
                  >
                    <Image
                      src={page.dataUrl}
                      alt={`PDF page ${page.pageNumber}`}
                      className="block h-auto w-full max-w-none"
                      height={page.height}
                      unoptimized
                      width={page.width}
                    />
                    {pageItems.map(({ candidate, index }) => {
                      const [x1, y1, x2, y2] = candidate.bbox;
                      const left = (x1 / page.pdfWidth) * 100;
                      const top = (y1 / page.pdfHeight) * 100;
                      const width = ((x2 - x1) / page.pdfWidth) * 100;
                      const height = ((y2 - y1) / page.pdfHeight) * 100;
                      const isActive = activeCandidateIndex === index;
                      const hideBoxOnly =
                        activeCandidateIndex !== null && !isActive;
                      const overlayFontSize = clamp(
                        BASE_OVERLAY_FONT_SIZE * zoom,
                        8,
                        20,
                      );

                      if (!showBboxes) {
                        return (
                          <div
                            key={`${candidate.page}-${candidate.span_index}-${index}`}
                            className="pointer-events-none absolute overflow-hidden text-left"
                            style={{
                              height: `${height}%`,
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${width}%`,
                            }}
                            title={`${candidate.kind}: ${candidate.match_text}`}
                          >
                            <span
                              className="absolute inset-0 overflow-hidden px-1 py-0.5 leading-tight text-zinc-800/90"
                              style={{
                                fontFamily: OVERLAY_FONT_FAMILY,
                                fontSize: `${overlayFontSize}px`,
                              }}
                            >
                              {candidate.value?.trim() ? candidate.value : ""}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={`${candidate.page}-${candidate.span_index}-${index}`}
                          type="button"
                          data-candidate-index={index}
                          className={`absolute overflow-hidden text-left transition ${
                            hideBoxOnly
                              ? "border-transparent bg-transparent shadow-none"
                              : isActive
                                ? "border border-cyan-500/95 bg-cyan-400/16 shadow-[0_0_0_2px_rgba(6,182,212,0.24)]"
                                : "border border-emerald-600/70 bg-emerald-400/12 shadow-[0_0_0_1px_rgba(5,150,105,0.16)]"
                          }`}
                          style={{
                            height: `${height}%`,
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                          }}
                          title={`${candidate.kind}: ${candidate.match_text}`}
                          disabled={hideBoxOnly}
                          onPointerDown={(event) => {
                            if (event.button !== 0) {
                              return;
                            }
                            event.stopPropagation();
                            const containerElement =
                              event.currentTarget.parentElement;
                            if (!containerElement) {
                              return;
                            }
                            onCandidateSelect(index);
                            interactionRef.current = {
                              candidateIndex: index,
                              containerRect:
                                containerElement.getBoundingClientRect(),
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
                              fontFamily: OVERLAY_FONT_FAMILY,
                              fontSize: `${overlayFontSize}px`,
                            }}
                          >
                            {candidate.value?.trim() ? candidate.value : ""}
                          </span>
                          <ResizeHandle
                            hidden={hideBoxOnly || !isActive}
                            direction="nw"
                            onPointerDown={(event) => {
                              beginResizeInteraction({
                                event,
                                candidateIndex: index,
                                direction: "nw",
                                onCandidateSelect,
                                interactionRef,
                                page,
                                startBbox: candidate.bbox,
                              });
                            }}
                          />
                          <ResizeHandle
                            hidden={hideBoxOnly || !isActive}
                            direction="ne"
                            onPointerDown={(event) => {
                              beginResizeInteraction({
                                event,
                                candidateIndex: index,
                                direction: "ne",
                                onCandidateSelect,
                                interactionRef,
                                page,
                                startBbox: candidate.bbox,
                              });
                            }}
                          />
                          <ResizeHandle
                            hidden={hideBoxOnly || !isActive}
                            direction="sw"
                            onPointerDown={(event) => {
                              beginResizeInteraction({
                                event,
                                candidateIndex: index,
                                direction: "sw",
                                onCandidateSelect,
                                interactionRef,
                                page,
                                startBbox: candidate.bbox,
                              });
                            }}
                          />
                          <ResizeHandle
                            hidden={hideBoxOnly || !isActive}
                            direction="se"
                            onPointerDown={(event) => {
                              beginResizeInteraction({
                                event,
                                candidateIndex: index,
                                direction: "se",
                                onCandidateSelect,
                                interactionRef,
                                page,
                                startBbox: candidate.bbox,
                              });
                            }}
                          />
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

function beginResizeInteraction({
  event,
  candidateIndex,
  direction,
  onCandidateSelect,
  interactionRef,
  page,
  startBbox,
}: {
  event: ReactPointerEvent<HTMLSpanElement>;
  candidateIndex: number;
  direction: ResizeHandle;
  onCandidateSelect: (candidateIndex: number | null) => void;
  interactionRef: RefObject<ActiveInteraction | null>;
  page: RenderedPage;
  startBbox: PdfFieldCandidate["bbox"];
}) {
  if (event.button !== 0) {
    return;
  }
  event.stopPropagation();
  const pageContainer = event.currentTarget.parentElement?.parentElement;
  if (!pageContainer) {
    return;
  }
  onCandidateSelect(candidateIndex);
  interactionRef.current = {
    candidateIndex,
    containerRect: pageContainer.getBoundingClientRect(),
    hasChanged: false,
    mode: "resize",
    handle: direction,
    page,
    startBbox,
    startX: event.clientX,
    startY: event.clientY,
  };
  event.preventDefault();
}

function resizeBboxFromHandle({
  handle,
  page,
  startBbox,
  deltaX,
  deltaY,
}: {
  handle: ResizeHandle;
  page: RenderedPage;
  startBbox: PdfFieldCandidate["bbox"];
  deltaX: number;
  deltaY: number;
}): PdfFieldCandidate["bbox"] {
  const [x1, y1, x2, y2] = startBbox;
  let nextX1 = x1;
  let nextY1 = y1;
  let nextX2 = x2;
  let nextY2 = y2;

  if (handle === "nw" || handle === "sw") {
    nextX1 = clamp(x1 + deltaX, 0, x2 - MIN_BOX_SIZE);
  }
  if (handle === "ne" || handle === "se") {
    nextX2 = clamp(x2 + deltaX, x1 + MIN_BOX_SIZE, page.pdfWidth);
  }
  if (handle === "nw" || handle === "ne") {
    nextY1 = clamp(y1 + deltaY, 0, y2 - MIN_BOX_SIZE);
  }
  if (handle === "sw" || handle === "se") {
    nextY2 = clamp(y2 + deltaY, y1 + MIN_BOX_SIZE, page.pdfHeight);
  }

  return [nextX1, nextY1, nextX2, nextY2];
}

function ResizeHandle({
  direction,
  hidden,
  onPointerDown,
}: {
  direction: ResizeHandle;
  hidden: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLSpanElement>) => void;
}) {
  const classesByDirection: Record<ResizeHandle, string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  };

  return (
    <span
      className={`absolute h-2 w-2 rounded-full border border-white bg-cyan-600 shadow-sm ${classesByDirection[direction]}`}
      style={{ display: hidden ? "none" : undefined }}
      onPointerDown={onPointerDown}
    />
  );
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
  const boxWidth = clamp(
    targetPage.pdfWidth * 0.26,
    120,
    targetPage.pdfWidth * 0.45,
  );
  const boxHeight = clamp(
    targetPage.pdfHeight * 0.035,
    24,
    targetPage.pdfHeight * 0.08,
  );
  const nextSpanIndex =
    candidates.reduce(
      (highestSpanIndex, candidate) =>
        Math.max(highestSpanIndex, candidate.span_index),
      -1,
    ) + 1;
  const x1 = clamp(centerX - boxWidth / 2, 0, targetPage.pdfWidth - boxWidth);
  const y1 = clamp(
    centerY - boxHeight / 2,
    0,
    targetPage.pdfHeight - boxHeight,
  );

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
  return bbox.map((value) =>
    Number(value.toFixed(2)),
  ) as PdfFieldCandidate["bbox"];
}

function isSameBbox(
  left: PdfFieldCandidate["bbox"],
  right: PdfFieldCandidate["bbox"],
): boolean {
  return left.every((value, index) => value === right[index]);
}
