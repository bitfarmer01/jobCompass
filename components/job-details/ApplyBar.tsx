import { Button } from "@/components/ui/button";

type Props = {
  url: string | null;
  company: string | null;
};

export function ApplyBar({ url, company }: Props) {
  const label = `Apply Now at ${company ?? "this company"}`;

  if (!url) {
    return (
      <Button variant="default" size="lg" disabled className="w-full">
        {label}
      </Button>
    );
  }

  return (
    <Button asChild variant="default" size="lg" className="w-full">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  );
}
