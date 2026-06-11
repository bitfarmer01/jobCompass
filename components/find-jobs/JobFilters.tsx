"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  filterText: string;
  onFilterTextChange: (value: string) => void;
  matchFilter: string;
  onMatchFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
};

export function JobFilters({
  filterText,
  onFilterTextChange,
  matchFilter,
  onMatchFilterChange,
  sortBy,
  onSortByChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <Input
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          placeholder="Filter by company or role..."
          className="pl-9"
        />
      </div>
      <Select value={matchFilter} onValueChange={onMatchFilterChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Matches</SelectItem>
          <SelectItem value="high">High Match</SelectItem>
          <SelectItem value="low">Low Match</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="match-score">Match Score</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
