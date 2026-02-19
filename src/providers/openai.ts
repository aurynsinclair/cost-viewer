import type { CostEntry } from "./aws.js";

export interface OpenAiCostOptions {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  apiKey: string;
}

interface CostResult {
  amount: { currency: string; value: number };
  line_item: string;
}

interface CostBucket {
  start_time: number;
  end_time: number;
  results: CostResult[];  // 配列（実際のAPIレスポンスに合わせて修正）
}

interface CostsResponse {
  data: CostBucket[];
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

  const response = await fetch(
    `https://api.openai.com/v1/organization/costs?${params}`,
    {
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} — ${body}`);
  }

  const data = (await response.json()) as CostsResponse;
  return parseBuckets(data.data ?? []);
}

function parseBuckets(buckets: CostBucket[]): CostEntry[] {
  const entries: CostEntry[] = [];

  for (const bucket of buckets) {
    const date = unixSecondsToDate(bucket.start_time);
    for (const result of bucket.results) {
      const amount = result.amount.value;
      if (amount <= 0) continue;

      entries.push({
        date,
        service: result.line_item,
        amount,
        currency: result.amount.currency.toUpperCase(),
      });
    }
  }

  return entries;
}
