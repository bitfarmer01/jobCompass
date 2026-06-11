// Adzuna job search client. See context/library-docs.md → Adzuna API for the
// project rules: always category=it-jobs, omit `where` when location is empty,
// source is always 'search' for jobs discovered here.

export type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string; // snippet only — not the full description
  redirect_url: string; // Adzuna tracking URL → redirects to actual job
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted: "0" | "1"; // "1" means salary is estimated
  contract_type?: string; // "permanent" | "contract"
  contract_time?: string; // "full_time" | "part_time"
  created: string; // ISO date string
  category: { tag: string; label: string };
};

export type AdzunaCountry = "us" | "gb" | "au" | "ca";

// Currency symbol per Adzuna country endpoint — used when persisting salary strings.
export const CURRENCY_SYMBOL: Record<AdzunaCountry, string> = {
  us: "$",
  gb: "£",
  au: "A$",
  ca: "CA$",
};

// Keyword → country lookup for the free-text location input. First match wins;
// anything unrecognized falls through to 'us'. Word-boundary matching prevents
// substring false-positives (e.g. "milwaukee" contains "uk", "perth amboy" contains "perth").
// "perth" is intentionally excluded — Perth Amboy, NJ makes it too ambiguous.
const COUNTRY_KEYWORDS: Array<[AdzunaCountry, string[]]> = [
  ["gb", ["uk", "united kingdom", "england", "scotland", "wales", "london", "manchester", "edinburgh"]],
  ["au", ["australia", "sydney", "melbourne", "brisbane"]],
  ["ca", ["canada", "toronto", "vancouver", "montreal", "ottawa"]],
];

export function detectCountry(location: string): AdzunaCountry {
  const normalized = location.toLowerCase();
  for (const [country, keywords] of COUNTRY_KEYWORDS) {
    if (keywords.some((k) => new RegExp(`\\b${k}\\b`).test(normalized))) return country;
  }
  return "us";
}

export async function searchJobs(
  jobTitle: string,
  location: string,
  country: AdzunaCountry = "us",
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_ID!,
    app_key: process.env.ADZUNA_API_KEY!,
    what: jobTitle,
    category: "it-jobs", // always filter to IT jobs
    results_per_page: "10",
    "content-type": "application/json",
  });

  // Only add where if location is provided
  if (location) {
    params.set("where", location);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}
