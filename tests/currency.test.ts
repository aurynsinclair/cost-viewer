import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchExchangeRate, convertToJPY, resetRateCache } from "../src/currency.js";

beforeEach(() => {
  resetRateCache();
});

describe("convertToJPY", () => {
  it("converts USD to JPY and rounds to integer", () => {
    expect(convertToJPY(1, 150)).toBe(150);
    expect(convertToJPY(1.23, 152.3)).toBe(187);
    expect(convertToJPY(0, 150)).toBe(0);
  });

  it("handles fractional results by rounding", () => {
    expect(convertToJPY(0.01, 150)).toBe(2); // 1.5 → rounds to 2
    expect(convertToJPY(0.001, 150)).toBe(0); // 0.15 → rounds to 0
  });
});

describe("fetchExchangeRate", () => {
  it("returns the JPY rate from the API", async () => {
    const mockResponse = {
      result: "success",
      rates: { JPY: 152.3 },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const rate = await fetchExchangeRate();
    expect(rate).toBe(152.3);
  });

  it("caches the rate on subsequent calls", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "success", rates: { JPY: 150 } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchExchangeRate();
    await fetchExchangeRate();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }));

    await expect(fetchExchangeRate()).rejects.toThrow("Failed to fetch exchange rate");
  });

  it("throws when JPY is missing from response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "success", rates: {} }),
    }));

    await expect(fetchExchangeRate()).rejects.toThrow("JPY rate not found");
  });
});
