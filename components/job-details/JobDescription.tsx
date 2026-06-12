import { ExternalLink, FileText } from "@/components/icons";

type Props = {
  text: string | null;
  sourceUrl: string | null;
};

// Adzuna's search API returns only a ~500-char snippet that ends in an ellipsis;
// the full description lives at the external posting. When the snippet is
// truncated, link out so the user can read the rest rather than seeing it cut
// off mid-sentence.
function isTruncated(text: string): boolean {
  return /(?:…|\.\.\.)\s*$/.test(text);
}

export function JobDescription({ text, sourceUrl }: Props) {
  const truncated = text !== null && isTruncated(text);

  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-accent" />
        <h2 className="text-base font-semibold text-text-primary">
          Job Description
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-text-dark whitespace-pre-line">
        {text ?? "No description provided for this job."}
      </p>
      {truncated && sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
        >
          Read the full description on the original posting
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </section>
  );
}
