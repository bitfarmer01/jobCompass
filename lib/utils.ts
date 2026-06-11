import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Job match threshold — defined once, imported everywhere this value is needed.
export const MATCH_THRESHOLD = 70;
