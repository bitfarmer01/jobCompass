import { Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { WorkExperience } from "@/types";

type Props = {
  index: number;
  value: WorkExperience;
  onChange: (value: WorkExperience) => void;
  onRemove: () => void;
};

export function WorkExperienceCard({
  index,
  value,
  onChange,
  onRemove,
}: Props) {
  const set = <K extends keyof WorkExperience>(
    key: K,
    fieldValue: WorkExperience[K],
  ) => onChange({ ...value, [key]: fieldValue });

  const currentId = `current-${index}`;

  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          Role {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-text-muted hover:text-error transition-colors"
          aria-label={`Remove role ${index + 1}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`company-${index}`}>Company Name</Label>
          <Input
            id={`company-${index}`}
            value={value.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Acme Inc."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`role-title-${index}`}>Job Title</Label>
          <Input
            id={`role-title-${index}`}
            value={value.job_title}
            onChange={(e) => set("job_title", e.target.value)}
            placeholder="Senior Frontend Engineer"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`start-${index}`}>Start Date</Label>
          <Input
            id={`start-${index}`}
            type="month"
            value={value.start_date}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`end-${index}`}>End Date</Label>
          <Input
            id={`end-${index}`}
            type="month"
            value={value.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            disabled={value.current}
          />
        </div>
      </div>

      <label
        htmlFor={currentId}
        className="flex items-center gap-2 cursor-pointer w-fit"
      >
        <Checkbox
          id={currentId}
          checked={value.current}
          onCheckedChange={(checked) => set("current", checked === true)}
        />
        <span className="text-sm text-text-secondary">
          I currently work here
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`resp-${index}`}>Key Responsibilities</Label>
        <Textarea
          id={`resp-${index}`}
          value={value.responsibilities}
          onChange={(e) => set("responsibilities", e.target.value)}
          placeholder="What you owned, shipped, and the impact you had."
        />
      </div>
    </div>
  );
}
