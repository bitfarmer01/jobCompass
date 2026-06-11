import { Button } from "@/components/ui/button";

type Props = {
  total: number;
  perPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
};

export function JobsPagination({
  total,
  perPage,
  currentPage,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  // A compact window of pages around the current one, with first/last anchors
  // and ellipses when there's a gap. Keeps the control to a fixed width no
  // matter how many pages exist.
  const windowStart = Math.max(1, currentPage - 1);
  const windowEnd = Math.min(totalPages, currentPage + 1);
  const windowPages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, i) => windowStart + i,
  );
  const showFirst = windowStart > 1;
  const showLeadingEllipsis = windowStart > 2;
  const showLast = windowEnd < totalPages;
  const showTrailingEllipsis = windowEnd < totalPages - 1;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">
        Showing{" "}
        <span className="font-medium text-text-primary">{start}</span> to{" "}
        <span className="font-medium text-text-primary">{end}</span> of{" "}
        <span className="font-medium text-text-primary">{total}</span> results
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>

        {showFirst && (
          <Button
            variant={currentPage === 1 ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(1)}
          >
            1
          </Button>
        )}
        {showLeadingEllipsis && (
          <span className="px-2 text-sm text-text-muted">...</span>
        )}

        {windowPages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {showTrailingEllipsis && (
          <span className="px-2 text-sm text-text-muted">...</span>
        )}
        {showLast && (
          <Button
            variant={currentPage === totalPages ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
