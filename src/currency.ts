// USD→JPY conversion using open.er-api.com (free, no key required)

const EXCHANGE_RATE_URL = "https://open.er-api.com/v6/latest/USD";

let cachedRate: number | null = null;

interface ExchangeRateResponse {
  result: string;
  rates: Record<string, number>;
}

export async function fetchExchangeRate(): Promise<number> {
  if (cachedRate !== null) return cachedRate;

  const response = await fetch(EXCHANGE_RATE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rate: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ExchangeRateResponse;
  if (data.result !== "success") {
    throw new Error(`Exchange rate API error: ${data.result}`);
  }

  const rate = data.rates["JPY"];
  if (rate === undefined) {
    throw new Error("JPY rate not found in exchange rate response");
  }

  cachedRate = rate;
  return rate;
}

export function convertToJPY(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

/** テスト用: キャッシュをリセット */
export function resetRateCache(): void {
  cachedRate = null;
}
