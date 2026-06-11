import { Button } from "@/components/ui/button";

export function JobsPagination() {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">
        Showing <span className="font-medium text-text-primary">1</span> to{" "}
        <span className="font-medium text-text-primary">6</span> of{" "}
        <span className="font-medium text-text-primary">24</span> results
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
        <Button variant="default" size="sm">
          1
        </Button>
        <Button variant="outline" size="sm">
          2
        </Button>
        <Button variant="outline" size="sm">
          3
        </Button>
        <span className="px-2 text-sm text-text-muted">...</span>
        <Button variant="outline" size="sm">
          4
        </Button>
        <Button variant="outline" size="sm">
          Next
        </Button>
      </div>
    </div>
  );
}
