"use client";

import { useState } from "react";
import { Plus, X } from "@/components/icons";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function TagInput({ values, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  };

  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={add}>
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-light text-accent"
            >
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                className="text-accent hover:text-accent-dark"
                aria-label={`Remove ${value}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
