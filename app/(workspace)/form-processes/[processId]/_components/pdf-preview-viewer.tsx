"use client";

import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PdfPreviewViewerProps = {
  src: string;
  title: string;
  className?: string;
  onLoadingStateChange?: (isLoading: boolean) => void;
  showZoomControls?: boolean;
};

type PdfModule = typeof import("pdfjs-dist/build/pdf.mjs");
type PdfDocument = Awaited<ReturnType<PdfModule["getDocument"]>["promise"]>;

const MIN_SCALE = 0.75;
const MAX_SCALE = 2;
const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 0.75;

let pdfModulePromise: Promise<PdfModule> | null = null;

async function loadPdfModule(): Promise<PdfModule> {
  if (!pdfModulePromise) {
    pdfModulePromise = import("pdfjs-dist/build/pdf.mjs").then((module) => {
      module.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();
      return module;
    });
  }

  return pdfModulePromise;
}

export function PdfPreviewViewer({
  src,
  title,
  className,
  onLoadingStateChange,
  showZoomControls = true,
}: PdfPreviewViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const pdfDocumentRef = useRef<PdfDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    onLoadingStateChange?.(isLoading);
  }, [isLoading, onLoadingStateChange]);

  useEffect(() => {
    let isActive = true;

    async function loadDocument() {
      setIsLoading(true);
      setErrorMessage("");
      setPageNumber(1);
      setScale(DEFAULT_SCALE);

      renderTaskRef.current?.cancel();
      pdfDocumentRef.current?.destroy();
      pdfDocumentRef.current = null;

      try {
        const [pdfjs, response] = await Promise.all([
          loadPdfModule(),
          fetch(src),
        ]);
        if (!response.ok) {
          throw new Error("Unable to load PDF preview.");
        }

        const data = await response.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data });
        const document = await loadingTask.promise;

        if (!isActive) {
          document.destroy();
          return;
        }

        pdfDocumentRef.current = document;
        setPageCount(document.numPages);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load PDF preview.",
        );
        setIsLoading(false);
      }
    }

    void loadDocument();

    return () => {
      isActive = false;
      renderTaskRef.current?.cancel();
      pdfDocumentRef.current?.destroy();
      pdfDocumentRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const document = pdfDocumentRef.current;
    const canvas = canvasRef.current;
    if (!document || !canvas || pageCount === 0) {
      return;
    }
    const pdfDocument = document;
    const pdfCanvas = canvas;

    let isActive = true;

    async function renderPage() {
      setIsLoading(true);
      setErrorMessage("");

      renderTaskRef.current?.cancel();

      try {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const context = pdfCanvas.getContext("2d");
        if (!context) {
          throw new Error("Unable to initialize PDF canvas.");
        }

        const outputScale = window.devicePixelRatio || 1;
        pdfCanvas.width = Math.floor(viewport.width * outputScale);
        pdfCanvas.height = Math.floor(viewport.height * outputScale);
        pdfCanvas.style.width = `${viewport.width}px`;
        pdfCanvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        const renderTask = page.render({
          canvas: pdfCanvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isActive) {
          return;
        }

        setIsLoading(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to render PDF preview.";
        if (message.toLowerCase().includes("cancel")) {
          return;
        }

        setErrorMessage(message);
        setIsLoading(false);
      }
    }

    void renderPage();

    return () => {
      isActive = false;
      renderTaskRef.current?.cancel();
    };
  }, [pageCount, pageNumber, scale]);

  const isPreviousDisabled = pageNumber <= 1 || pageCount === 0 || isLoading;
  const isNextDisabled =
    pageCount === 0 || pageNumber >= pageCount || isLoading;
  const isZoomOutDisabled = scale <= MIN_SCALE || isLoading;
  const isZoomInDisabled = scale >= MAX_SCALE || isLoading;

  return (
    <div className={cn("flex h-full flex-col bg-zinc-100", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-3 py-2">
        <p className="truncate text-sm font-medium text-zinc-700">{title}</p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5"
            disabled={isPreviousDisabled}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="min-w-20 text-center text-sm text-zinc-600">
            {pageCount === 0 ? "Page -" : `Page ${pageNumber} / ${pageCount}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5"
            disabled={isNextDisabled}
            onClick={() =>
              setPageNumber((current) => Math.min(pageCount, current + 1))
            }
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
          {showZoomControls ? (
            <div className="ml-2 flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                disabled={isZoomOutDisabled}
                onClick={() =>
                  setScale((current) =>
                    Math.max(MIN_SCALE, current - SCALE_STEP),
                  )
                }
              >
                <ZoomOut className="size-4" />
              </Button>
              <span className="min-w-14 text-center text-sm text-zinc-600">
                {Math.round(scale * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                disabled={isZoomInDisabled}
                onClick={() =>
                  setScale((current) =>
                    Math.min(MAX_SCALE, current + SCALE_STEP),
                  )
                }
              >
                <ZoomIn className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative flex-1 overflow-auto p-4">
        {errorMessage ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 text-center">
            <TriangleAlert className="size-8 text-red-500" />
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          </div>
        ) : (
          <div className="flex min-h-full min-w-full items-start justify-center">
            <canvas
              ref={canvasRef}
              aria-label={title}
              className="block rounded-lg bg-white shadow-sm"
            />
          </div>
        )}

        {isLoading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
            <LoaderCircle className="size-8 animate-spin text-zinc-500" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
