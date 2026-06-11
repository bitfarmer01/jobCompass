"use client";

import { useRef, useState, useTransition } from "react";
import { UploadCloud, FileText, Sparkles, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadResume } from "@/actions/profile";
import type { ExtractedProfile } from "@/types";

type Props = {
  initialResumePath?: string;
  onExtracted?: (data: ExtractedProfile) => void;
};

export function ResumeUpload({ initialResumePath, onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(Boolean(initialResumePath));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleExtract = async () => {
    setError(null);
    setExtractSuccess(false);
    setIsExtracting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch("/api/resume/extract", {
        method: "POST",
        signal: controller.signal,
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: ExtractedProfile;
        error?: string;
      };
      if (json.success && json.data) {
        onExtracted?.(json.data);
        setExtractSuccess(true);
      } else {
        setError(json.error ?? "Extraction failed. Please try again.");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "Extraction timed out. Please try again."
          : "Extraction failed. Please try again.",
      );
    } finally {
      clearTimeout(timeoutId);
      setIsExtracting(false);
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Resume must be a PDF.");
      return;
    }
    setFileName(file.name);
    const formData = new FormData();
    formData.append("resume", file);
    startTransition(async () => {
      const res = await uploadResume(formData);
      if (res.success) {
        setHasResume(true);
      } else {
        setError(res.error ?? "Failed to upload resume.");
      }
    });
  };

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base font-semibold text-text-primary">Resume</h2>

      {hasResume && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">
              {fileName ?? "Resume on file"}
            </span>
          </div>
          <a
            href="/api/resume"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark flex-shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            View
          </a>
        </div>
      )}

      <div
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 cursor-pointer transition-colors ${
          dragging
            ? "border-accent bg-accent-muted"
            : "border-border-muted bg-surface-secondary hover:bg-surface-tertiary"
        }`}
      >
        <UploadCloud className="w-7 h-7 text-text-muted" />
        <p className="text-sm font-medium text-text-primary">
          {isPending
            ? "Uploading…"
            : hasResume
              ? "Upload a new resume to replace it"
              : "Click to upload or drag and drop"}
        </p>
        <p className="text-xs text-text-muted">PDF only · max 5 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {extractSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Profile fields populated — review and save when ready.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={pick}
          disabled={isPending || isExtracting}
        >
          <FileText className="w-4 h-4" />
          Select Resume
        </Button>
        {hasResume && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleExtract}
            disabled={isPending || isExtracting}
          >
            <Sparkles className="w-4 h-4" />
            {isExtracting ? "Extracting…" : "Extract from Resume"}
          </Button>
        )}
        <Button type="button" variant="secondary" disabled>
          <Sparkles className="w-4 h-4" />
          Generate Resume from Profile
        </Button>
      </div>
    </div>
  );
}
