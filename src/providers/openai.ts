import type { CostEntry } from "./aws.js";

export interface OpenAiCostOptions {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  apiKey: string;
}

interface CostResult {
  amount: { currency: string; value: string };  // API returns string, not number
  line_item: string | null;
}

interface CostBucket {
  start_time: number;
  end_time: number;
  results: CostResult[];
}

interface CostsResponse {
  data: CostBucket[];
  has_more: boolean;
  next_page: string | null;
}

function toUnixSeconds(date: string): number {
  return Math.floor(new Date(date).getTime() / 1000);
}

function unixSecondsToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export async function getOpenAiCosts(options: OpenAiCostOptions): Promise<CostEntry[]> {
  const params = new URLSearchParams({
    start_time: String(toUnixSeconds(options.startDate)),
    end_time: String(toUnixSeconds(options.endDate)),
    bucket_width: "1d",
  });
  // group_by[] must not be percent-encoded — URLSearchParams encodes [] as %5B%5D
  const baseUrl = `https://api.openai.com/v1/organization/costs?${params}&group_by[]=line_item`;

  const allBuckets: CostBucket[] = [];
  let pageUrl = baseUrl;

  while (true) {
    const response = await fetch(pageUrl, {
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} — ${body}`);
    }

    const data = (await response.json()) as CostsResponse;
    allBuckets.push(...(data.data ?? []));

    if (!data.has_more || !data.next_page) break;
    pageUrl = `${baseUrl}&page=${data.next_page}`;
  }

  return parseBuckets(allBuckets);
}

function parseBuckets(buckets: CostBucket[]): CostEntry[] {
  const entries: CostEntry[] = [];

  for (const bucket of buckets) {
    const date = unixSecondsToDate(bucket.start_time);
    for (const result of bucket.results) {
      const amount = parseFloat(result.amount.value);
      if (!isFinite(amount) || amount <= 0) continue;

      entries.push({
        date,
        service: result.line_item ?? "(other)",
        amount,
        currency: result.amount.currency.toUpperCase(),
      });
    }
  }

  return entries;
}
