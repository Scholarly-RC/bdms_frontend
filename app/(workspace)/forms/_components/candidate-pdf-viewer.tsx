"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";

import type { PdfFieldCandidate } from "@/app/(workspace)/forms/_lib/types";
import { PdfPreviewViewer } from "@/app/(workspace)/forms/[formId]/preview/_components/pdf-preview-viewer";

type CandidatePdfViewerProps = {
  activeCandidateIndex: number | null;
  candidates: PdfFieldCandidate[];
  createCandidateRequest?: number;
  fileUrl: string;
  isEditable?: boolean;
  onCandidateCreate?: (candidate: PdfFieldCandidate) => void;
  onCandidateSelect: (candidateIndex: number | null) => void;
  onCommitCandidates: (nextCandidates: PdfFieldCandidate[]) => void;
  onSetCandidates: Dispatch<SetStateAction<PdfFieldCandidate[]>>;
  showBboxes?: boolean;
};

export function CandidatePdfViewer({
  activeCandidateIndex,
  candidates,
  createCandidateRequest = 0,
  fileUrl,
  isEditable = true,
  onCandidateCreate,
  onCandidateSelect,
  onCommitCandidates,
  onSetCandidates,
  showBboxes = true,
}: CandidatePdfViewerProps) {
  const latestCandidatesRef = useRef<PdfFieldCandidate[]>(candidates);

  useEffect(() => {
    latestCandidatesRef.current = candidates;
  }, [candidates]);

  const handleCandidateChange = useCallback(
    (candidateIndex: number, nextBbox: PdfFieldCandidate["bbox"]) => {
      if (!isEditable) {
        return;
      }
      onSetCandidates((current) =>
        current.map((candidate, index) =>
          index === candidateIndex
            ? { ...candidate, bbox: nextBbox }
            : candidate,
        ),
      );
    },
    [isEditable, onSetCandidates],
  );

  const handleCandidateCommit = useCallback(() => {
    if (!isEditable) {
      return;
    }
    onCommitCandidates(latestCandidatesRef.current);
  }, [isEditable, onCommitCandidates]);

  const handleCandidateCreate = useCallback(
    (candidate: PdfFieldCandidate) => {
      if (!isEditable) {
        return;
      }
      onCandidateCreate?.(candidate);
    },
    [isEditable, onCandidateCreate],
  );

  return (
    <PdfPreviewViewer
      activeCandidateIndex={activeCandidateIndex}
      candidates={candidates}
      createCandidateRequest={createCandidateRequest}
      fileUrl={fileUrl}
      showBboxes={showBboxes}
      onCandidateChange={handleCandidateChange}
      onCandidateCommit={handleCandidateCommit}
      onCandidateCreate={handleCandidateCreate}
      onCandidateSelect={onCandidateSelect}
    />
  );
}
